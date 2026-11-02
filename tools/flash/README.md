# Flash Player check

Tests Minerva against Adobe Flash Player itself, the program that wrote the SOL files in the first place:

1. Flash Player writes SharedObjects with its own encoder. These are the `Flash11-*.sol` files in `SOL Samples/`.
2. Flash Player reads the files Minerva wrote (`Test-*.sol`) and reports whether every value came through.

Two test SWFs are involved:

- `FlashTest.as` covers ActionScript 3. It is compiled with the Flex SDK, writes AMF3 and AMF0, and reads `Test-AMF3-Strings.sol` and `Test-AMF0-Strings.sol`.
- `make_as2_swf.py` covers ActionScript 2. It builds the SWF directly from AVM1 bytecode, because no current compiler targets AS2. The SWF writes AMF0 and reads `Test-AMF0-References.sol` and `Test-AMF0-Strings.sol`.

This check is how Minerva's handling of emoji (standard 4-byte UTF-8) and of AMF0 reference numbering was established. Flash Player numbers references differently for ActionScript 2 and ActionScript 3; see the main README.

## What you need

Adobe's files can't be redistributed, so none of them are in this repository. You need:

| What | Where to get it | Pass it as |
|---|---|---|
| **Flash Player debug projector** for Windows, `FlashPlayerDebugger.exe` (tested with 11.4) | Flash Builder 4.7 installs it in `C:\Program Files\Adobe\Adobe Flash Builder 4.7 (64 Bit)\player\win\11.4\`. Adobe no longer offers Flash Player downloads. | `FLASH_PLAYER` |
| **`playerglobal.swc`**, the Flash Player API library that the compiler links against (11.1 or later) | Flash Builder 4.7: `...\sdks\4.6.0\frameworks\libs\player\11.1\playerglobal.swc`. Apache's Flex SDK doesn't include it. | `PLAYERGLOBAL` |
| **Apache Flex SDK**, for its `mxmlc` compiler (tested with 4.16.1) | The `apache-flex-sdk-4.16.1-bin` archive from flex.apache.org or its mirrors | `FLEX_SDK` |
| **Wine** (tested with 11), to run the Windows projector | Your distribution's packages | |
| **Java** (21+ works; a JRE is enough for `mxmlc`), **Python 3** and **Node** | Your distribution's packages | |
| **A display**: Flash Player opens a window | A desktop session. On a headless machine, run the script under `xvfb-run`. | |

Use the debug projector, not the browser plugin (`libflashplayer.so` or the ActiveX/NPAPI installers). Current browsers can't load the plugin. The debug projector also writes `trace()` output to a log, which is how the results come back. Flash Player 11.x predates Adobe's 2021 end-of-life block, so it still runs content.

## Running it

```sh
FLASH_PLAYER=~/flash/FlashPlayerDebugger.exe \
PLAYERGLOBAL=~/flash/playerglobal.swc \
FLEX_SDK=~/flash/apache-flex-sdk-4.16.1-bin \
npm run check:flash
```

The script:

1. compiles `FlashTest.swf` and builds `As2Test.swf` in `work/`, which is gitignored;
2. creates a Wine prefix of its own in `work/wine`, so your other Wine programs aren't affected;
3. sets up the debug player's trace log (`mm.cfg`) and raises Flash's local storage limit from 100 KB to 10 MB, because the AMF0 test writes about 340 KB;
4. runs each SWF twice. The first run creates its SharedObject folder and writes Flash's files. The script then copies in fresh copies of Minerva's `Test-*.sol`, and the second run reads them. A Flash window opens briefly each time;
5. copies Flash's files to `work/out/` under their `SOL Samples` names and compares them with the samples. ActionScript 3 writes object keys and Dictionary entries in hash order, which changes between runs. Its files are therefore reported as "same data … in a different order" when only the order differs;
6. checks the trace logs and exits with an error if any check failed.

Typical output:

```
Files written by Flash Player (in .../tools/flash/work/out):
  Flash11-AS2-References.sol: same as SOL Samples
  ...
  Flash11-AS3-AMF0-Date-XML.sol: same data as SOL Samples, in a different order
  ...
Flash Player read Minerva's files: 28 checks passed, 0 failed
```

Delete `work/` to start over from a fresh Wine prefix.

## Files

- `FlashTest.as`: the ActionScript 3 test.
- `make_as2_swf.py`: builds the ActionScript 2 test SWF, and holds the values `check_log.py` expects from it.
- `run.sh`: runs everything.
- `flash_settings.py`: writes Flash Player's local storage setting.
- `check_log.py`: checks the trace logs.
- `compare_sol.mjs`: compares two SOL files' data, ignoring key order. It uses Minerva's AMF readers from `app/src/amf`.
