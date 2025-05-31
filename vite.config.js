import { defineConfig } from 'vite';
import { resolve } from 'path';
import { terser } from 'rollup-plugin-terser';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Read the version from package.json
const pkg = require('./package.json');
const version = pkg.version;

export default defineConfig({
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'src/aquery.js',
                    dest: '.', // Copy to dist/
                    rename: `aquery-${version}.js`, // Versioned file
                },
            ],
        }),
    ],
    build: {
        minify: false, // Disable Vite's default minification (handled by Terser)
        rollupOptions: {
            input: {
                aquery: resolve(__dirname, 'src/aquery.js'),
            },
            output: [
                {
                    format: 'iife', // IIFE for global usage like jQuery
                    name: 'aquery', // Global variable name (e.g., window.aquery)
                    entryFileNames: `aquery-${version}.min.js`, // Versioned minified file
                    dir: 'dist',
                    exports: 'named',
                    sourcemap: true,
                    plugins: [
                        terser({
                            output: {
                                comments: false,
                            },
                        }),
                    ],
                },
            ],
        },
    },
});