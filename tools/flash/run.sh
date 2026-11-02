#!/bin/sh
# Tests Minerva's SOL files against Adobe Flash Player itself. See README.md for what you need.
#
#   FLASH_PLAYER=/path/to/FlashPlayerDebugger.exe \
#   PLAYERGLOBAL=/path/to/playerglobal.swc \
#   FLEX_SDK=/path/to/apache-flex-sdk-4.16.1-bin \
#   tools/flash/run.sh
set -e
cd "$(dirname "$0")"
HERE=$(pwd)
SAMPLES="$HERE/../../SOL Samples"
WORK="$HERE/work"

die() { echo "$*" >&2; exit 1; }
[ -f "$FLASH_PLAYER" ] || die "Set FLASH_PLAYER to the Flash Player debug projector (FlashPlayerDebugger.exe)"
[ -f "$PLAYERGLOBAL" ] || die "Set PLAYERGLOBAL to playerglobal.swc"
[ -x "$FLEX_SDK/bin/mxmlc" ] || die "Set FLEX_SDK to an Apache Flex SDK folder (one with bin/mxmlc)"
for cmd in wine winepath java python3 node; do command -v $cmd >/dev/null || die "$cmd is required"; done
[ -n "$DISPLAY" ] || die "Flash Player needs a display: run from a desktop session, or wrap this script in xvfb-run"

mkdir -p "$WORK/player/11.1" "$WORK/out"
cp "$PLAYERGLOBAL" "$WORK/player/11.1/playerglobal.swc"

echo "Building the test SWFs"
PLAYERGLOBAL_HOME="$WORK/player" "$FLEX_SDK/bin/mxmlc" -target-player=11.1 -swf-version=14 \
    -static-link-runtime-shared-libraries=true -debug=false -omit-trace-statements=false \
    -output "$WORK/FlashTest.swf" FlashTest.as >"$WORK/mxmlc.log" 2>&1 || { cat "$WORK/mxmlc.log"; die "mxmlc failed"; }
python3 make_as2_swf.py "$WORK/As2Test.swf"

# A Wine prefix of its own, so nothing touches your other Wine programs
export WINEPREFIX="$WORK/wine" WINEDEBUG=-all WINEDLLOVERRIDES="mscoree,mshtml="
if [ ! -d "$WINEPREFIX/drive_c" ]; then
    echo "Creating the Wine prefix (first run only)"
    wineboot -i >/dev/null 2>&1
fi
PROFILE=$(winepath -u "$(wine cmd /c 'echo %USERPROFILE%' 2>/dev/null | tr -d '\r')")
FLASH_DATA="$PROFILE/AppData/Roaming/Macromedia/Flash Player"
LOG="$FLASH_DATA/Logs/flashlog.txt"
# The debug player writes trace() output to flashlog.txt when mm.cfg asks it to
printf 'ErrorReportingEnable=1\r\nTraceOutputFileEnable=1\r\n' > "$PROFILE/mm.cfg"
python3 flash_settings.py "$FLASH_DATA"

play() {
    rm -f "$LOG"
    timeout 120 wine "$FLASH_PLAYER" "$(winepath -w "$WORK/$1")" >/dev/null 2>&1 || true
}

# Each SWF gets its own SharedObject folder (named after the SWF's path) the first time it runs
storage() { find "$FLASH_DATA/#SharedObjects" -type d -name "$1" | head -n 1; }

echo "Running the tests in Flash Player (a Flash window opens briefly, four times)"
play FlashTest.swf
play As2Test.swf
AS3_DIR=$(storage FlashTest.swf)
AS2_DIR=$(storage As2Test.swf)
[ -d "$AS3_DIR" ] && [ -d "$AS2_DIR" ] || die "Flash Player didn't create its SharedObject folders"

# Second runs read Minerva's files (fresh copies: Flash rewrites SharedObjects it opened when it quits)
cp "$SAMPLES/Test-AMF3-Strings.sol" "$SAMPLES/Test-AMF0-Strings.sol" "$AS3_DIR/"
cp "$SAMPLES/Test-AMF0-References.sol" "$SAMPLES/Test-AMF0-Strings.sol" "$AS2_DIR/"
play FlashTest.swf
cp "$LOG" "$WORK/as3.log"
play As2Test.swf
cp "$LOG" "$WORK/as2.log"

# Collect what Flash wrote, under the names used in SOL Samples
echo
echo "Files written by Flash Player (in $WORK/out):"
while read -r dir name sample; do
    src="$( [ "$dir" = as3 ] && echo "$AS3_DIR" || echo "$AS2_DIR" )/$name.sol"
    if [ ! -f "$src" ]; then echo "  $sample: not written"; continue; fi
    cp "$src" "$WORK/out/$sample"
    if cmp -s "$src" "$SAMPLES/$sample"; then
        echo "  $sample: same as SOL Samples"
    elif node compare_sol.mjs "$src" "$SAMPLES/$sample"; then
        echo "  $sample: same data as SOL Samples, in a different order"
    else
        echo "  $sample: different data from SOL Samples"
    fi
done <<EOF
as2 as2-amf0 Flash11-AS2-References.sol
as2 as2-dates Flash11-AS2-Date-XML.sol
as2 as2-arr-date Flash11-AS2-Array-Date.sol
as2 as2-arr-xml Flash11-AS2-Array-XML.sol
as3 fp-amf3 Flash11-AS3-AMF3-Strings-References.sol
as3 fp-amf0 Flash11-AS3-AMF0-Strings-References.sol
as3 as3-dates Flash11-AS3-AMF0-Date-XML.sol
as3 as3-arr-date Flash11-AS3-AMF0-Array-Date.sol
as3 as3-arr-xml Flash11-AS3-AMF0-Array-XML.sol
EOF

echo
python3 check_log.py "$WORK/as3.log" "$WORK/as2.log"
