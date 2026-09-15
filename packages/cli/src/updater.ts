import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import chalk from 'chalk';

const REPO = 'Dibij/Verya';

export interface ReleaseInfo {
  version: string;
  tagName: string;
  assets: Array<{ name: string; browser_download_url: string }>;
}

/**
 * Compare semver strings: a > b -> 1, a < b -> -1, equal -> 0
 */
export function compareSemver(a: string, b: string): number {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map((num) => parseInt(num, 10) || 0);
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
 * Fetch latest release metadata from GitHub API with timeout
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
        timeout: 3000,
      },
      (res) => {
        if (res.statusCode !== 200) {
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
      }
    );

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Determines the installation directory based on OS
 */
function getInstallDir(): string {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(localAppData, 'Programs', 'Verya');
  }
  return path.join(os.homedir(), '.local', 'share', 'verya');
}

/**
 * Downloads a file to a destination path
 */
function downloadFile(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, { headers: { 'User-Agent': 'Verya-CLI' } }, (res) => {
      // Handle redirects (GitHub release asset downloads redirect to AWS S3)
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers.location;
        if (!redirectUrl) {
          resolve(false);
          return;
        }
        https.get(redirectUrl, (redirectRes) => {
          redirectRes.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(true);
          });
        }).on('error', () => resolve(false));
        return;
      }

      if (res.statusCode !== 200) {
        resolve(false);
        return;
      }

      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    });

    req.on('error', () => resolve(false));
  });
}

/**
 * Performs self-update by downloading the release archive and unpacking it
 */
export async function autoUpdate(release: ReleaseInfo): Promise<boolean> {
  const installDir = getInstallDir();
  const isWindows = process.platform === 'win32';
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const platform = isWindows ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';

  const assetName = isWindows
    ? 'verya-windows-x64.zip'
    : `verya-${platform}-${arch}.tar.gz`;

  const asset = release.assets.find((a) => a.name === assetName);
  if (!asset) {
    return false;
  }

  const tempFile = path.join(os.tmpdir(), assetName);
  console.log(chalk.cyan(`⬇ Downloading Verya ${release.tagName}...`));

  const downloaded = await downloadFile(asset.browser_download_url, tempFile);
  if (!downloaded) {
    console.log(chalk.yellow('⚠ Failed to download update archive.'));
    return false;
  }

  console.log(chalk.cyan(`📦 Unpacking update to ${installDir}...`));
  try {
    fs.mkdirSync(installDir, { recursive: true });
    if (isWindows) {
      execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${tempFile}' -DestinationPath '${installDir}' -Force"`, { stdio: 'ignore' });
    } else {
      execSync(`tar -xzf "${tempFile}" -C "${installDir}"`, { stdio: 'ignore' });
    }
    try { fs.unlinkSync(tempFile); } catch {}

    // Ensure production dependencies
    const commanderDir = path.join(installDir, 'node_modules', 'commander');
    if (!fs.existsSync(commanderDir)) {
      console.log(chalk.gray('Installing dependencies...'));
      execSync('npm install --omit=dev', { cwd: installDir, stdio: 'ignore' });
    }

    console.log(chalk.green(`✓ Successfully updated Verya to ${release.tagName}!\n`));
    return true;
  } catch (err) {
    console.log(chalk.yellow(`⚠ Update unpack failed: ${err instanceof Error ? err.message : String(err)}`));
    return false;
  }
}

/**
 * Checks for updates on CLI startup and auto-updates if a newer release is published
 */
export async function checkForUpdates(currentVersion: string): Promise<void> {
  try {
    const latest = await getLatestRelease();
    if (!latest) return;

    if (compareSemver(latest.version, currentVersion) > 0) {
      console.log(
        chalk.yellow.bold(`\n🔔 New version available: `) +
        chalk.gray(`v${currentVersion} → `) +
        chalk.green.bold(`${latest.tagName}`)
      );
      console.log(chalk.gray(`Updating automatically so you have the latest features...`));

      const success = await autoUpdate(latest);
      if (success) {
        console.log(chalk.cyan(`Restarting with Verya ${latest.tagName}...\n`));
        // Re-spawn the CLI with the updated version and identical arguments
        const installDir = getInstallDir();
        const updatedEntry = path.join(installDir, 'packages', 'cli', 'dist', 'index.js');
        if (fs.existsSync(updatedEntry)) {
          execSync(`node "${updatedEntry}" ${process.argv.slice(2).join(' ')}`, { stdio: 'inherit' });
          process.exit(0);
        }
      }
    }
  } catch {
    // Non-blocking: If offline or rate-limited, continue seamlessly
  }
}
