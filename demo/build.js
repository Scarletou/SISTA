// Bundles the real engine + demo UI into one self-contained HTML file.
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

const { outputFiles } = await build({
  entryPoints: [new URL('./app.js', import.meta.url).pathname],
  bundle: true, format: 'iife', write: false, minify: true, target: 'es2020',
});
const template = await readFile(new URL('./template.html', import.meta.url), 'utf8');
const js = outputFiles[0].text.replace(/<\/script/g, '<\\/script');
await writeFile(new URL('./index.html', import.meta.url), template.replace('/*BUNDLE*/', js));
console.log('demo/index.html built');
