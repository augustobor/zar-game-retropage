// Renderiza docs/diagrams/*.mmd → *.svg con el tema retro (docs/diagrams/mermaid.config.json).
// Uso: npm run docs:diagrams
// Usa el Chrome/Edge instalado (no descarga uno): se puede forzar con PUPPETEER_EXECUTABLE_PATH.
import { run } from '@mermaid-js/mermaid-cli';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKGROUND = '#120a22';
const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const dir = join(dirname(fileURLToPath(import.meta.url)), 'diagrams');
const mermaidConfig = JSON.parse(readFileSync(join(dir, 'mermaid.config.json'), 'utf8'));
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ?? BROWSERS.find((path) => existsSync(path));

if (!executablePath) {
  console.error('No se encontró Chrome/Edge. Definí PUPPETEER_EXECUTABLE_PATH con la ruta del navegador.');
  process.exit(1);
}

for (const file of readdirSync(dir).filter((f) => f.endsWith('.mmd'))) {
  const input = join(dir, file);
  const output = input.replace(/\.mmd$/, '.svg');
  await run(input, output, {
    quiet: true,
    puppeteerConfig: { executablePath, headless: 'shell' },
    parseMMDOptions: { mermaidConfig, backgroundColor: BACKGROUND },
  });
  console.log(`✔ ${file} → ${file.replace(/\.mmd$/, '.svg')}`);
}
