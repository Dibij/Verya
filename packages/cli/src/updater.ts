import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import chalk from 'chalk';

const REPO = 'Dibij/Verya';

export interface ReleaseInfo {
  version: string;
  tagName: string;
  assets: Array<{ name: string; browser_download_url: string }>;
}

const REQUEST_TIMEOUT_MS = 3000;
const DOWNLOAD_TIMEOUT_MS = 60_000;

/**
 * Compare semver strings: a > b -> 1, a < b -> -1, equal -> 0
 */
export function compareSemver(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/, '')
      .split('.')
      .map((num) => parseInt(num, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/**
 * Fetch latest release metadata from GitHub API with timeout.
 */
export async function getLatestRelease(): Promise<ReleaseInfo | null> {
  return new Promise((resolve) => {
    const req = https.get(
      `https://api.github.com/repos/${REPO}/releases/latest`,
      {
        headers: {
          'User-Agent': 'Verya-CLI-AutoUpdater',
          Accept: 'application/vnd.github.v3+json',
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          resolve(null);
          return;
        }

        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve({
              version: data.tag_name ? data.tag_name.replace(/^v/, '') : '',
              tagName: data.tag_name || '',
              assets: data.assets || [],
            });
          } catch {
            resolve(null);
          }
        });
      },
    );

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Determines the installation directory based on OS.
 */
export function getInstallDir(): string {
  if (process.platform === 'win32') {
    const localAppData =
      process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(localAppData, 'Programs', 'Verya');
  }
  return path.join(os.homedir(), '.local', 'share', 'verya');
}

function getAssetName(): string {
  const isWindows = process.platform === 'win32';
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const platform = isWindows ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
  return isWindows ? 'verya-windows-x64.zip' : `verya-${platform}-${arch}.tar.gz`;
}

function download(url: string, dest: string, redirects = 0): Promise<boolean> {
  return new Promise((resolve) => {
    if (redirects > 5) {
      resolve(false);
      return;
    }

    const req = https.get(
      url,
      { headers: { 'User-Agent': 'Verya-CLI' }, timeout: DOWNLOAD_TIMEOUT_MS },
      (res) => {
        const status = res.statusCode ?? 0;

        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          download(res.headers.location, dest, redirects + 1).then(resolve);
          return;
        }

        if (status !== 200) {
          res.resume();
          resolve(false);
          return;
        }

        const file = fs.createWriteStream(dest);
        res.pipe(file);

        file.on('finish', () => {
          file.close(() => resolve(true));
        });
        file.on('error', () => {
          try {
            fs.unlinkSync(dest);
          } catch {
            // ignore
          }
          resolve(false);
        });
      },
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function fetchText(url: string, redirects = 0): Promise<string | null> {
  return new Promise((resolve) => {
    if (redirects > 5) return resolve(null);

    const req = https.get(
      url,
      { headers: { 'User-Agent': 'Verya-CLI' }, timeout: REQUEST_TIMEOUT_MS },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          fetchText(res.headers.location, redirects + 1).then(resolve);
          return;
        }
        if (status !== 200) {
          res.resume();
          return resolve(null);
        }

        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve(body));
      },
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

function sha256File(filePath: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

/**
 * Verify the downloaded archive against the release's checksums.txt.
 * Returns false when the checksum file is missing or does not match.
 */
async function verifyChecksum(
  release: ReleaseInfo,
  assetName: string,
  filePath: string,
): Promise<boolean> {
  const checksumAsset = release.assets.find((a) => a.name === 'checksums.txt');
  if (!checksumAsset) {
    console.warn(chalk.yellow('⚠ Release has no checksums.txt — refusing to auto-install.'));
    return false;
  }

  const text = await fetchText(checksumAsset.browser_download_url);
  if (!text) {
    console.warn(chalk.yellow('⚠ Could not download checksums.txt.'));
    return false;
  }

  const expected = text
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .find((parts) => parts[1] === assetName)?.[0];

  if (!expected) {
    console.warn(chalk.yellow(`⚠ No checksum entry for ${assetName}.`));
    return false;
  }

  const actual = sha256File(filePath);
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    console.warn(chalk.red('✖ Checksum mismatch — downloaded archive discarded.'));
    return false;
  }

  return true;
}

/**
 * Perform self-update. Downloads, verifies, and extracts the release archive.
 */
export async function autoUpdate(release: ReleaseInfo): Promise<boolean> {
  const installDir = getInstallDir();
  const isWindows = process.platform === 'win32';
  const assetName = getAssetName();

  const asset = release.assets.find((a) => a.name === assetName);
  if (!asset) return false;

  const tempFile = path.join(os.tmpdir(), `verya-${process.pid}-${assetName}`);
  console.log(chalk.cyan(`⬇ Downloading Verya ${release.tagName}...`));

  const downloaded = await download(asset.browser_download_url, tempFile);
  if (!downloaded) {
    console.log(chalk.yellow('⚠ Failed to download update archive.'));
    return false;
  }

  const verified = await verifyChecksum(release, assetName, tempFile);
  if (!verified) {
    try {
      fs.unlinkSync(tempFile);
    } catch {
      // ignore
    }
    return false;
  }

  console.log(chalk.cyan(`📦 Unpacking update to ${installDir}...`));
  try {
    fs.mkdirSync(installDir, { recursive: true });

    if (isWindows) {
      const result = spawnSync(
        'powershell',
        [
          '-NoProfile',
          '-Command',
          `Expand-Archive -LiteralPath '${tempFile.replace(/'/g, "''")}' -DestinationPath '${installDir.replace(/'/g, "''")}' -Force`,
        ],
        { stdio: 'ignore' },
      );
      if (result.status !== 0) throw new Error('Expand-Archive failed');
    } else {
      const result = spawnSync('tar', ['-xzf', tempFile, '-C', installDir], {
        stdio: 'ignore',
      });
      if (result.status !== 0) throw new Error('tar extraction failed');
    }

    try {
      fs.unlinkSync(tempFile);
    } catch {
      // ignore
    }

    const commanderDir = path.join(installDir, 'node_modules', 'commander');
    if (!fs.existsSync(commanderDir)) {
      console.log(chalk.gray('Installing dependencies...'));
      spawnSync('npm', ['install', '--omit=dev'], { cwd: installDir, stdio: 'ignore' });
    }

    console.log(chalk.green(`✓ Successfully updated Verya to ${release.tagName}!\n`));
    return true;
  } catch (err) {
    console.log(
      chalk.yellow(`⚠ Update unpack failed: ${err instanceof Error ? err.message : String(err)}`),
    );
    return false;
  }
}

/**
 * Check for updates on CLI startup.
 *
 * By default this only *notifies* the user. Applying the update requires an
 * explicit opt-in so that a CLI invocation never silently replaces the running
 * installation with network-supplied code.
 */
export async function checkForUpdates(
  currentVersion: string,
  options: { autoApply?: boolean } = {},
): Promise<void> {
  try {
    const latest = await getLatestRelease();
    if (!latest || !latest.version) return;
    if (compareSemver(latest.version, currentVersion) <= 0) return;

    console.log(
      chalk.yellow.bold(`\n🔔 New version available: `) +
        chalk.gray(`v${currentVersion} → `) +
        chalk.green.bold(`${latest.tagName}`),
    );

    if (!options.autoApply) {
      console.log(
        chalk.gray('Run `verya --update` to install it (or `--no-update` to silence this).\n'),
      );
      return;
    }

    const success = await autoUpdate(latest);
    if (success) {
      const installDir = getInstallDir();
      const updatedEntry = path.join(installDir, 'packages', 'cli', 'dist', 'index.js');
      if (fs.existsSync(updatedEntry)) {
        console.log(chalk.cyan(`Restarting with Verya ${latest.tagName}...\n`));
        const result = spawnSync(process.execPath, [updatedEntry, ...process.argv.slice(2)], {
          stdio: 'inherit',
        });
        process.exit(result.status ?? 0);
      }
    }
  } catch {
    // Non-blocking: offline or rate-limited.
  }
}
