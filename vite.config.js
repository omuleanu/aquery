import { defineConfig } from 'vite';
import { resolve } from 'path';
import { terser } from 'rollup-plugin-terser';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'src/aquery.js',
                    dest: '.', // Copy to dist/
                    rename: 'aquery.js', // Non-versioned file
                },
            ],
        }),
    ],
    build: {
        minify: false, // Disable Vite's default minification (handled by Terser)
        sourcemap: true,
        rollupOptions: {
            input: {
                aquery: resolve(__dirname, 'src/aquery.js'),
            },
            output: [
                {
                    format: 'iife', // IIFE for global usage like jQuery
                    name: 'aquery', // Global variable name (e.g., window.aquery)
                    entryFileNames: 'aquery.min.js', // Non-versioned minified file
                    dir: 'dist',
                    exports: 'named',                    
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