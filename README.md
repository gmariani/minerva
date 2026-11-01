**.minerva** is a Flash Local Shared Object editor built based on the AMF3 specification and the AMF0 specification.

**.minerva** is capable of reading and writing all known data types successfully.

## Development

Requires Node.js 20.19+ (or 22.12+).

```sh
npm install
npm run dev       # dev server with hot reload
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm run lint      # ESLint
```

The app source lives in `app/` (Vite root). Files in `app/public/` (icons, manifest, browserconfig) are copied to `dist/` unchanged. The service worker in `app/service-worker.js` is only registered in production builds; `vite.config.js` fills in its version and precache list at build time.

Deploy the contents of `dist/`. The build uses relative paths, so it can be served from any sub-directory.
