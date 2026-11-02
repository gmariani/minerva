# BlazeDS check

Compares what Minerva's AMF readers (`app/src/amf`) read from each SOL file with what [BlazeDS](https://github.com/apache/flex-blazeds) reads. BlazeDS is the AMF implementation Adobe built for its servers and open-sourced through Apache.

```sh
npm run check:blazeds                    # all files in SOL Samples/
tools/blazeds/run.sh path/to/file.sol    # specific files
```

You need Java 21 or newer (a JRE is enough, since `SolCheck.java` runs straight from source) and Node. The first run downloads the BlazeDS 4.8.0 jars from Maven Central into `lib/` and checks them against the SHA-1 sums published there.

The script exits with an error only if there's a difference that isn't listed in `KNOWN` in `compare.mjs`. The known differences are:

- **AMF0 references**: BlazeDS numbers them by objects from 0, as the AMF0 spec says. Flash Player 11 numbers them differently for ActionScript 2 and ActionScript 3, and Minerva follows Flash Player (see the main README). Most AS2 files with references read differently in BlazeDS, and some fail to open in it.
- **Emoji in AMF0**: BlazeDS reads AMF0 strings with Java's modified UTF-8, which rejects 4-byte characters. Both specs call for standard UTF-8.
- **BlazeDS limitations**: it can't hold a dictionary that is its own key, and it can't decode a made-up externalizable class.
- `2.sol` is truncated, and `00000004.sol` has a header that BlazeDS doesn't accept.

BlazeDS only creates classes on an allow-list, so `SolCheck.java` allows just the basic types and collections that AMF data needs. It decodes XML with DOCTYPE declarations and external entities turned off.
