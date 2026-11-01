import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

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

// Replaces the build-time placeholders in index.html and emits the service worker with a
// precache list built from the hashed output files.
function minerva() {
    return {
        name: 'minerva',
        transformIndexHtml: fillPlaceholders,
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
    plugins: [minerva()],
    worker: {
        format: 'es',
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        sourcemap: true,
    },
});
