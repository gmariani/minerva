#!/bin/sh
# Checks Minerva's AMF readers against BlazeDS, Adobe's open-sourced AMF implementation.
# Needs Java 21+ (a JRE is enough) and Node. Usage: tools/blazeds/run.sh [file.sol ...]  (default: all samples)
set -e
cd "$(dirname "$0")"

VERSION=4.8.0
# SHA-1 sums published on Maven Central for the release
JARS="flex-messaging-core:6d44307664e3884cd987fda49f29bace16175080
flex-messaging-common:84a8b31298fd31bcc3a9be0001c55c1e53b06536"

mkdir -p lib
echo "$JARS" | while IFS=: read -r name sha1; do
    jar="lib/$name-$VERSION.jar"
    if [ ! -f "$jar" ]; then
        echo "Downloading $name $VERSION"
        curl -sSfL -o "$jar.part" "https://repo1.maven.org/maven2/org/apache/flex/blazeds/$name/$VERSION/$name-$VERSION.jar"
        mv "$jar.part" "$jar"
    fi
    echo "$sha1  $jar" | sha1sum -c --quiet || { rm -f "$jar"; echo "Checksum mismatch for $jar" >&2; exit 1; }
done

if [ "$#" -eq 0 ]; then set -- ../../SOL\ Samples/*.sol; fi

out=$(mktemp)
trap 'rm -f "$out"' EXIT
java -cp "lib/*" SolCheck.java "$@" > "$out"
node compare.mjs "$out" "$@"
