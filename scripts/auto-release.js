#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const run = (cmd, opts = {}) => {
  console.log(`\x1b[36m> ${cmd}\x1b[0m`);
  return execSync(cmd, { cwd: rootDir, stdio: 'inherit', ...opts });
};

const runCapture = (cmd) => {
  return execSync(cmd, { cwd: rootDir, encoding: 'utf-8' }).trim();
};

const releaseType = process.argv[2] || 'patch'; // patch, minor, major, or explicit 'v0.3.0'

// 1. Check working directory status
const status = runCapture('git status --porcelain');
if (status && !process.argv.includes('--force')) {
  console.log('\x1b[33mUncommitted changes detected. Auto-committing...\x1b[0m');
  run('git add -A');
  run('git commit -m "chore: save changes before release"');
}

// 2. Read latest git tag
let currentTag = 'v0.2.2';
try {
  const latestTag = runCapture('git describe --tags --abbrev=0');
  if (latestTag.startsWith('v')) {
    currentTag = latestTag;
  }
} catch {
  // fallback
}

// 3. Compute new tag
let nextTag = '';
if (releaseType.startsWith('v') && releaseType.includes('.')) {
  nextTag = releaseType;
} else {
  const clean = currentTag.replace(/^v/, '');
  const [major, minor, patch] = clean.split('.').map(Number);
  if (releaseType === 'major') {
    nextTag = `v${major + 1}.0.0`;
  } else if (releaseType === 'minor') {
    nextTag = `v${major}.${minor + 1}.0`;
  } else {
    nextTag = `v${major}.${minor}.${(patch || 0) + 1}`;
  }
}

console.log(`\x1b[32m\n🚀 Automating Verya Release: ${currentTag} → ${nextTag}\x1b[0m\n`);

// 4. Update packages/cli/src/index.ts VERSION if present
const cliIndexPath = path.join(rootDir, 'packages', 'cli', 'src', 'index.ts');
if (fs.existsSync(cliIndexPath)) {
  let content = fs.readFileSync(cliIndexPath, 'utf-8');
  content = content.replace(/const VERSION = '.*?';/, `const VERSION = '${nextTag.replace(/^v/, '')}';`);
  fs.writeFileSync(cliIndexPath, content, 'utf-8');
}

// 5. Build and package release archives
console.log('\x1b[35m\n📦 1. Building and packaging platform artifacts...\x1b[0m');
run('npm run build');
run('npm run package');

// 6. Git commit, tag and push
console.log('\x1b[35m\n📤 2. Committing & pushing to GitHub...\x1b[0m');
run('git add -A');
try {
  run(`git commit -m "chore: release ${nextTag}"`);
} catch {
  // Nothing to commit if files didn't change
}
run(`git tag -a ${nextTag} -m "Release ${nextTag}"`);
run('git push origin master');
run(`git push origin ${nextTag}`);

// 7. Publish to GitHub Release via gh CLI if available
console.log('\x1b[35m\n🌐 3. Publishing GitHub Release with assets...\x1b[0m');
try {
  run(`gh release create ${nextTag} \\
    dist-release/verya-linux-x64.tar.gz \\
    dist-release/verya-linux-arm64.tar.gz \\
    dist-release/verya-macos-x64.tar.gz \\
    dist-release/verya-macos-arm64.tar.gz \\
    dist-release/verya-windows-x64.zip \\
    dist-release/install.sh \\
    dist-release/install.ps1 \\
    dist-release/VeryaSetup.cmd \\
    dist-release/checksums.txt \\
    --title "Verya ${nextTag}" \\
    --generate-notes`);
  console.log(`\x1b[32m\n🎉 Released ${nextTag} successfully to GitHub!\x1b[0m`);
} catch (err) {
  console.log('\x1b[33mNote: gh CLI not authenticated or already published via GitHub Actions.\x1b[0m');
}
