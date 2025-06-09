import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
    plugins: [
        viteStaticCopy({
            targets: [
                { src: 'src/aquery.js', dest: '.' }, // Copy to dist/
            ],
        }),
    ],
    build: {
        minify: 'esbuild', // Use Vite's default minifier
        sourcemap: true,
        rollupOptions: {
            input: {
                aquery: 'src/aquery.js',
            },
            output: [
                {
                    name: 'aquery', // Global variable name (window.aquery)
                    entryFileNames: 'aquery.min.js',
                    dir: 'dist',
                },
            ],
        },
    },
});
