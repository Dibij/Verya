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

// 1. Refuse to release from a dirty tree. Releases must be reproducible: the
//    tagged commit has to match exactly what was built.
const status = runCapture('git status --porcelain');
if (status) {
  console.error('\x1b[31mRefusing to release: working tree has uncommitted changes.\x1b[0m');
  console.error('Commit or stash your changes first so the tag matches the build.');
  process.exit(1);
}

// 2. Read the current version from the single source of truth (package.json).
const rootPkgPath = path.join(rootDir, 'package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
const currentVersion = rootPkg.version;
const currentTag = `v${currentVersion}`;

// 3. Compute new tag
let nextTag = '';
if (releaseType.startsWith('v') && releaseType.includes('.')) {
  nextTag = releaseType;
} else {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  if (releaseType === 'major') {
    nextTag = `v${major + 1}.0.0`;
  } else if (releaseType === 'minor') {
    nextTag = `v${major}.${minor + 1}.0`;
  } else {
    nextTag = `v${major}.${(minor ?? 0) + 0}.${(patch || 0) + 1}`;
  }
}

const nextVersion = nextTag.replace(/^v/, '');
console.log(`\x1b[32m\n🚀 Automating Verya Release: ${currentTag} → ${nextTag}\x1b[0m\n`);

// 4. Keep every package manifest in sync with the root version.
function syncPackageVersion(pkgPath) {
  if (!fs.existsSync(pkgPath)) return;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.version = nextVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
}

syncPackageVersion(rootPkgPath);
for (const pkgName of ['cli', 'server', 'ui']) {
  syncPackageVersion(path.join(rootDir, 'packages', pkgName, 'package.json'));
}

// 5. Build and package release archives
console.log('\x1b[35m\n📦 1. Building and packaging platform artifacts...\x1b[0m');
run('npm run build');
run('npm run package');

// 6. Commit the version bump and tag the exact build commit.
console.log('\x1b[35m\n📤 2. Committing & tagging...\x1b[0m');
run('git add -A');
try {
  run(`git commit -m "chore: release ${nextTag}"`);
} catch {
  // Nothing to commit if only the tag changed.
}
run(`git tag -a ${nextTag} -m "Release ${nextTag}"`);

// 7. Push the commit and the tag. Publishing the GitHub release is left to the
//    release workflow, which runs on the tag and uploads the same artifacts.
console.log('\x1b[35m\n📤 3. Pushing commit and tag...\x1b[0m');
try {
  run('git push origin HEAD');
  run(`git push origin ${nextTag}`);
  console.log(`\x1b[32m\n🎉 Pushed ${nextTag}. The release workflow will publish the assets.\x1b[0m`);
} catch {
  console.log('\x1b[33mPush failed — the tag exists locally but was not published.\x1b[0m');
  process.exitCode = 1;
}
