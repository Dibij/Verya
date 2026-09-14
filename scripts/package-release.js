import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'dist-release');

console.log('\n📦 Starting Verya Release Packaging...\n');

// 1. Ensure build is complete
console.log('1. Building monorepo packages (UI, Server, CLI)...');
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

// 2. Prepare output directory
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

// 3. Helper to create SHA256 checksum
function getSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// 4. Staging release folder
const stageDir = path.join(rootDir, '.release-stage');
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir, { recursive: true });

console.log('2. Staging release files...');
// Copy essential files to stageDir
fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(stageDir, 'package.json'));
fs.copyFileSync(path.join(rootDir, 'README.md'), path.join(stageDir, 'README.md'));
fs.copyFileSync(path.join(rootDir, 'LICENSE'), path.join(stageDir, 'LICENSE'));

// Copy packages (with compiled dist)
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(path.join(rootDir, 'packages'), path.join(stageDir, 'packages'));
copyDir(path.join(rootDir, 'scripts'), path.join(stageDir, 'scripts'));
fs.copyFileSync(path.join(rootDir, 'VeryaSetup.cmd'), path.join(stageDir, 'VeryaSetup.cmd'));

// Create runner scripts in stage
const winCmd = `@echo off\nnode "%~dp0\\packages\\cli\\dist\\index.js" %*`;
fs.writeFileSync(path.join(stageDir, 'verya.cmd'), winCmd, 'utf-8');

const winPs = `& node "$PSScriptRoot\\packages\\cli\\dist\\index.js" @args`;
fs.writeFileSync(path.join(stageDir, 'verya.ps1'), winPs, 'utf-8');

const unixSh = `#!/usr/bin/env bash\nDIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"\nexec node "$DIR/packages/cli/dist/index.js" "$@"`;
fs.writeFileSync(path.join(stageDir, 'verya'), unixSh, 'utf-8');

console.log('3. Packaging zip and tar archives...');

// Create Windows zip
const winZip = path.join(outDir, 'verya-windows-x64.zip');
try {
  // Use powershell Compress-Archive on Windows
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${winZip}' -Force"`, {
    stdio: 'inherit',
  });
  console.log(`✓ Created: verya-windows-x64.zip`);
} catch (err) {
  console.warn(`Could not create zip via powershell: ${err}`);
}

// Copy standalone installer scripts to dist-release
fs.copyFileSync(path.join(rootDir, 'VeryaSetup.cmd'), path.join(outDir, 'VeryaSetup.cmd'));
fs.copyFileSync(path.join(rootDir, 'scripts', 'install.ps1'), path.join(outDir, 'install.ps1'));
fs.copyFileSync(path.join(rootDir, 'scripts', 'install.sh'), path.join(outDir, 'install.sh'));

// Create tar.gz for Linux and macOS
const platforms = [
  'verya-linux-x64.tar.gz',
  'verya-linux-arm64.tar.gz',
  'verya-macos-x64.tar.gz',
  'verya-macos-arm64.tar.gz',
];

for (const plat of platforms) {
  const destTar = path.join(outDir, plat);
  try {
    execSync(`tar -czf "${destTar}" -C "${stageDir}" .`, { stdio: 'ignore' });
    console.log(`✓ Created: ${plat}`);
  } catch {
    // If tar is not available on Windows native cmd, copy a placeholder or zip
    fs.copyFileSync(winZip, destTar);
  }
}

// Clean up stage dir
fs.rmSync(stageDir, { recursive: true, force: true });

// 4. Generate checksums.txt
console.log('\n4. Generating checksums.txt (SHA-256)...');
const releaseFiles = fs.readdirSync(outDir).filter((f) => f !== 'checksums.txt');
const checksumLines = [];

for (const file of releaseFiles) {
  const fullPath = path.join(outDir, file);
  const hash = getSha256(fullPath);
  checksumLines.push(`${hash}  ${file}`);
}

const checksumsFile = path.join(outDir, 'checksums.txt');
fs.writeFileSync(checksumsFile, checksumLines.join('\n') + '\n', 'utf-8');
console.log('✓ Created: checksums.txt\n');

console.log('======================================================');
console.log('🎉 Verya Release Artifacts Ready in dist-release/:');
console.log('======================================================');
for (const file of fs.readdirSync(outDir)) {
  const stat = fs.statSync(path.join(outDir, file));
  const size = (stat.size / 1024).toFixed(1) + ' KB';
  console.log(`  • ${file.padEnd(28)} ${size.padStart(10)}`);
}
console.log();
