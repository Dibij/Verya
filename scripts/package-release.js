import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'dist-release');
const stageRoot = path.join(rootDir, '.release-stage');

const run = (cmd, opts = {}) => execSync(cmd, { cwd: rootDir, stdio: 'inherit', ...opts });

console.log('\n📦 Starting Verya Release Packaging...\n');

// 1. Ensure build is complete
console.log('1. Building monorepo packages (UI, Server, CLI)...');
run('npm run build');

// 2. Prepare output directory
if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

function getSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

/**
 * Stage a complete install tree.
 *
 * The published payload is plain JavaScript (the UI is a prebuilt Vite bundle),
 * so it is architecture-independent. The only real difference between
 * artifacts is the launcher scripts: Windows needs `.cmd`/`.ps1`, Unix needs an
 * executable shell script.
 */
function buildStage(target) {
  const stageDir = path.join(stageRoot, target);
  fs.mkdirSync(stageDir, { recursive: true });

  fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(stageDir, 'package.json'));
  fs.copyFileSync(path.join(rootDir, 'README.md'), path.join(stageDir, 'README.md'));
  fs.copyFileSync(path.join(rootDir, 'LICENSE'), path.join(stageDir, 'LICENSE'));
  fs.copyFileSync(path.join(rootDir, 'tsconfig.base.json'), path.join(stageDir, 'tsconfig.base.json'));

  copyDir(path.join(rootDir, 'packages'), path.join(stageDir, 'packages'));
  copyDir(path.join(rootDir, 'scripts'), path.join(stageDir, 'scripts'));

  if (target === 'windows') {
    fs.copyFileSync(path.join(rootDir, 'VeryaSetup.cmd'), path.join(stageDir, 'VeryaSetup.cmd'));

    const winCmd = `@echo off\r
if not exist "%~dp0node_modules\\commander" (\r
  echo [Verya] Installing dependencies...\r
  call npm install --omit=dev --prefix "%~dp0"\r
)\r
node "%~dp0packages\\cli\\dist\\index.js" %*\r
`;
    fs.writeFileSync(path.join(stageDir, 'verya.cmd'), winCmd, 'utf-8');

    const winPs = `if (-not (Test-Path "$PSScriptRoot/node_modules/commander")) {
  Write-Host "[Verya] Installing dependencies..." -ForegroundColor Cyan
  npm install --omit=dev --prefix "$PSScriptRoot"
}
& node "$PSScriptRoot/packages/cli/dist/index.js" @args
`;
    fs.writeFileSync(path.join(stageDir, 'verya.ps1'), winPs, 'utf-8');
  } else {
    const unixSh = `#!/usr/bin/env bash
DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
if [ ! -d "$DIR/node_modules/commander" ]; then
  echo "[Verya] Installing dependencies..."
  (cd "$DIR" && npm install --omit=dev)
fi
exec node "$DIR/packages/cli/dist/index.js" "$@"
`;
    const launcher = path.join(stageDir, 'verya');
    fs.writeFileSync(launcher, unixSh, 'utf-8');
    fs.chmodSync(launcher, 0o755);
  }

  return stageDir;
}

console.log('2. Staging release files...');
if (fs.existsSync(stageRoot)) fs.rmSync(stageRoot, { recursive: true, force: true });
const windowsStage = buildStage('windows');
const unixStage = buildStage('unix');

// 3. Create the Windows archive
console.log('3. Packaging archives...');
const winZip = path.join(outDir, 'verya-windows-x64.zip');
let zipCreated = false;

for (const psCmd of ['pwsh', 'powershell']) {
  try {
    execSync(
      `${psCmd} -NoProfile -Command "Compress-Archive -Path '${windowsStage}/*' -DestinationPath '${winZip}' -Force"`,
      { stdio: 'ignore' },
    );
    if (fs.existsSync(winZip)) {
      console.log(`✓ Created: verya-windows-x64.zip (via ${psCmd})`);
      zipCreated = true;
      break;
    }
  } catch {
    // try next archiver
  }
}

if (!zipCreated) {
  try {
    execSync(`zip -r -q "${winZip}" .`, { cwd: windowsStage, stdio: 'ignore' });
    zipCreated = fs.existsSync(winZip);
    if (zipCreated) console.log('✓ Created: verya-windows-x64.zip (via zip -r)');
  } catch {
    // handled below
  }
}

if (!zipCreated) {
  throw new Error('Failed to create verya-windows-x64.zip (no zip or PowerShell available)');
}

// 4. Unix tarballs. The payload is identical across architectures; the tar is
//    named per-platform because that is what the installer and updater request.
const platforms = [
  'verya-linux-x64.tar.gz',
  'verya-linux-arm64.tar.gz',
  'verya-macos-x64.tar.gz',
  'verya-macos-arm64.tar.gz',
];

for (const plat of platforms) {
  const destTar = path.join(outDir, plat);
  execSync(`tar -czf "${destTar}" -C "${unixStage}" .`, { stdio: 'ignore' });
  console.log(`✓ Created: ${plat}`);
}

// 5. Standalone installers
fs.copyFileSync(path.join(rootDir, 'VeryaSetup.cmd'), path.join(outDir, 'VeryaSetup.cmd'));
fs.copyFileSync(path.join(rootDir, 'scripts', 'install.ps1'), path.join(outDir, 'install.ps1'));
fs.copyFileSync(path.join(rootDir, 'scripts', 'install.sh'), path.join(outDir, 'install.sh'));

// 6. Checksums
console.log('\n4. Generating checksums.txt (SHA-256)...');
const checksumLines = [];
for (const file of fs.readdirSync(outDir).sort()) {
  if (file === 'checksums.txt') continue;
  const fullPath = path.join(outDir, file);
  if (!fs.statSync(fullPath).isFile()) continue;
  checksumLines.push(`${getSha256(fullPath)}  ${file}`);
}
fs.writeFileSync(path.join(outDir, 'checksums.txt'), checksumLines.join('\n') + '\n', 'utf-8');
console.log('✓ Created: checksums.txt');

fs.rmSync(stageRoot, { recursive: true, force: true });

console.log('\n======================================================');
console.log('🎉 Verya Release Artifacts Ready in dist-release/:');
console.log('======================================================');
for (const file of fs.readdirSync(outDir)) {
  const stat = fs.statSync(path.join(outDir, file));
  console.log(`  • ${file.padEnd(28)} ${(stat.size / 1024).toFixed(1).padStart(10)} KB`);
}
console.log();
