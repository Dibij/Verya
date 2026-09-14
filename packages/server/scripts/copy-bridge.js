import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const src = path.resolve(__dirname, '../src/bridge.js');
const distDir = path.resolve(__dirname, '../dist');
const dest = path.resolve(distDir, 'bridge.js');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.copyFileSync(src, dest);
console.log('Copied bridge.js to dist/bridge.js');
