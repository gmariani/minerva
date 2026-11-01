import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const build = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${now.getTime()}`;
const placeholders = {
    '%VERSION%': pkg.version,
    '%BUILD%': build,
    '%YEAR%': String(now.getFullYear()),
    '%BUILT%': `${now.getDate()}-${MONTHS[now.getMonth()]}-${now.getFullYear()}`,
};
const fillPlaceholders = (str) => Object.entries(placeholders).reduce((s, [key, value]) => s.replaceAll(key, value), str);

// Emits the service worker with its version and a precache list built from the hashed output files
function minerva() {
    return {
        name: 'minerva',
        generateBundle(options, bundle) {
            const files = Object.keys(bundle).filter((file) => !file.endsWith('.map'));
            const source = readFileSync(fileURLToPath(new URL('./app/service-worker.js', import.meta.url)), 'utf8');
            this.emitFile({
                type: 'asset',
                fileName: 'service-worker.js',
                source: fillPlaceholders(source).replace("'%PRECACHE%'", files.map((file) => JSON.stringify(file)).join(', ')),
            });
        },
    };
}

export default defineConfig({
    root: 'app',
    base: './',
    plugins: [react(), minerva()],
    define: {
        __APP_VERSION__: JSON.stringify(placeholders['%VERSION%']),
        __BUILD_ID__: JSON.stringify(placeholders['%BUILD%']),
        __BUILD_YEAR__: JSON.stringify(placeholders['%YEAR%']),
        __BUILT_ON__: JSON.stringify(placeholders['%BUILT%']),
    },
    worker: {
        format: 'es',
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        sourcemap: true,
    },
});
