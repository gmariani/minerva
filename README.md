**.minerva** is a Flash Local Shared Object editor built based on the AMF3 specification and the AMF0 specification.

**.minerva** is capable of reading and writing all known data types successfully.

## License

Available under your choice of the ISC, MIT or Apache 2.0 license (`ISC OR MIT OR Apache-2.0`). See [LICENSE.md](LICENSE.md), which also lists the third-party material that keeps its own terms.

## JSON export

Exports use [superjson](https://github.com/flightcontrolhq/superjson)'s layout: the values as plain JSON under `json`, and their AMF types under `meta.values`, keyed by path. Values without an entry get a guessed type on import, so hand-added values work, and plain JSON (without `json`/`meta`) can be imported too. See `app/src/model/typedJSON.ts` for the details.

## Scripting

With a file open, the browser console has a `minerva` object for reading and changing values, importing/exporting JSON and opening/saving files. Run `minerva.help()` for the commands.

## Sample files

`SOL Samples/` holds the files used to test reading and writing. Most of them were collected for .minerva; [Ruffle](https://github.com/ruffle-rs/ruffle)'s [flash-lso](https://github.com/ruffle-rs/rust-flash-lso) crate uses them in its own tests ([credited here](https://github.com/ruffle-rs/rust-flash-lso/blob/88b315f1712ca6816b5834b81506b84cf9ecff8f/flash-lso/tests/README.md)).

These come from flash-lso's test suite (MIT License, Copyright (c) 2020 Callum Thomson):

- `AS2-ECMAArray-Demo2.sol`, `AS2-half-life-2-flash.sol`, `fishtycoon.sol`, `Johngame5.sol`, `mainprofile.sol`, `self-referential.sol`
- `AMF3-*.sol`: flash-lso's single-value AMF3 tests (`tests/amf/*.amf`), each wrapped in an AMF3 SOL file as the variable `v`. `AMF3-externalizable-object-back-reference.sol` is expected to open with a warning: it uses a made-up externalizable class whose data can't be decoded.

`Test-*.sol` were built with .minerva to cover cases the real files don't. A separate reader written from the specs checked them, and the code before these fixes misreads all three:

- `Test-AMF3-Strings.sol` and `Test-AMF0-Strings.sol`: emoji and other characters above U+FFFF (in values and names), CJK text, pretty-printed XML and XMLDocument, and strings past 64 KB in bytes but not in characters. The AMF0 file also has the String/LongString boundary at exactly 65,535 and 65,536 bytes.
- `Test-AMF0-References.sol`: AS2 object references that follow primitive values, including a shared object and an object that contains itself, numbered the way Flash Player's ActionScript 2 does. Flash Player 11 reads it correctly.

`Flash11-*.sol` were written by Flash Player 11.4 itself (the debug projector), from the test SWFs in `tools/flash/`. They're the reference for how Flash really encodes things:

- Emoji and other characters above U+FFFF are written as standard 4-byte UTF-8 in both AMF0 and AMF3.
- AMF0 object references are numbered differently by ActionScript 2 and ActionScript 3:
  - ActionScript 2: the SharedObject's data object is 0, then objects, arrays and XML documents. Dates don't take a number.
  - ActionScript 3 (with AMF0 encoding): objects, arrays, XML documents and Dates, from 0.
  - The AMF0 specification only says "complex objects" from 0. .minerva tries the ActionScript 2 rule first, then the ActionScript 3 one, and saves a file with the rule it was read with.
  - An ActionScript 3 file whose references never point back into themselves can look valid under both rules. `Flash11-AS3-AMF0-Array-XML.sol` is one: it opens with the ActionScript 2 rule, which shows one reference pointing at the wrong item. It still saves byte for byte.

`fishtycoon.sol` is not a Flash Player file. flash-lso's history shows it was replaced, the day after flash-lso added a reference writer, with a version whose references use that writer's numbering (every value counted). flash-lso later disabled that writer. .minerva reads the file as Flash Player would.

`2.sol` is truncated and is expected to fail to open.

## Development

Requires Node.js 20.19+ (or 22.12+).

```sh
npm install
npm run dev        # dev server with hot reload
npm run build      # type check, then production build into dist/
npm run preview    # serve the production build locally
npm run lint       # ESLint
npm run typecheck  # TypeScript only
npm run check:blazeds  # compare the AMF readers with Adobe's BlazeDS (needs Java), see tools/blazeds/
npm run check:flash    # test against Flash Player itself (needs your own copy), see tools/flash/
```

The app lives in `app/` (Vite root):

- `app/src/` — the React + TypeScript interface (`App.tsx`, `components/`, `model/` for the tree state and save/export conversion, `sol/` for the SOL tree builder and worker wrappers)
- `app/src/amf/` and `app/src/sol/*Worker.js` — the AMF0/AMF3 readers and writers (plain JavaScript), run in Web Workers
- `app/css/` — the stylesheets
- `app/public/` — icons, manifest and browserconfig, copied to `dist/` unchanged

The service worker in `app/service-worker.js` is only registered in production builds; `vite.config.js` fills in its version and precache list at build time.

Deploy the contents of `dist/`. The build uses relative paths, so it can be served from any sub-directory.
