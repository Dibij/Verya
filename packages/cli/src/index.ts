#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { detectProject } from './detect.js';
import { spawnVeryaServer } from './spawn.js';
import { sessionManager } from '@verya/server';
import { checkForUpdates } from './updater.js';

const VERSION = '0.2.2';

const BANNER = chalk.bold.hex('#6366f1')(`
 __   _____ ____  _   _   _   
 \\ \\ / / __| __ )\\ \\ / / /_\\  
  \\ V /| _||    \\ \\ V / / _ \\ 
   \\_/ |___|_||_|  |_| /_/ \\_\\
`) + chalk.gray(` Verya ${VERSION} — Visual editing for real code.\n`);

const program = new Command();

program
  .name('verya')
  .description('Verya — Visual editing for real code')
  .version(`Verya ${VERSION}`, '-v, --version', 'Output the installed Verya version')
  .argument('[path]', 'Path to your React project (directory or entry file)', '.')
  .option('-p, --port <port>', 'Port for the Verya server', '3111')
  .option('-s, --session <id>', 'Resume a specific editing session')
  .option('--list-sessions', 'List existing sessions for this project')
  .option('--verbose', 'Show detailed debug and compiler output')
  .option('--no-open', 'Do not open browser automatically')
  .option('--no-update', 'Skip checking for newer Verya versions on startup')
  .action(async (projectPath: string, options: { port: string; session?: string; listSessions?: boolean; verbose?: boolean; open: boolean; update: boolean }) => {
    // 0. Auto-check for updates if running normal command
    if (options.update !== false && !options.listSessions) {
      await checkForUpdates(VERSION);
    }

    // 1. Session listing mode
    const targetDir = path.resolve(projectPath);

    if (options.listSessions) {
      console.log(BANNER);
      try {
        const sessions = await sessionManager.listSessions(targetDir);
        if (sessions.length === 0) {
          console.log(chalk.yellow(`No previous sessions found for: ${targetDir}\n`));
        } else {
          console.log(chalk.bold(`Previous Verya Sessions for: ${targetDir}\n`));
          for (const s of sessions) {
            console.log(
              chalk.cyan(`• ${s.name}`) +
              chalk.gray(` [ID: ${s.id}]`) + '\n' +
              chalk.white(`  Modified: ${s.modifiedFiles.length} file(s)`) +
              chalk.gray(` • Updated: ${new Date(s.updatedAt).toLocaleString()}`) +
              (s.saved ? chalk.green(' • [Saved]') : chalk.yellow(' • [Unsaved]')) +
              '\n'
            );
          }
          console.log(chalk.gray(`To resume a session: verya -s <session-id>\n`));
        }
        process.exit(0);
      } catch (err) {
        console.error(chalk.red('✖ Failed to list sessions:'), err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    }

    // 2. Project Detection
    let detected;
    try {
      detected = await detectProject(projectPath);
    } catch (err) {
      console.log(chalk.bold.hex('#6366f1')('\nVerya\n'));
      console.log(chalk.red(`No supported frontend project detected in:\n  ${chalk.white(targetDir)}\n`));
      console.log(chalk.gray('Supported project types:'));
      console.log(chalk.white('  React + TypeScript / JavaScript (Vite, CRA, Next)\n'));
      console.log(chalk.cyan('Try running verya inside your project folder:'));
      console.log(chalk.gray('  cd /path/to/my-react-app'));
      console.log(chalk.gray('  verya\n'));
      if (options.verbose && err instanceof Error) {
        console.log(chalk.dim(err.stack));
      }
      process.exit(1);
    }

    // 3. Clean CLI Banner & Output (matches Phase 3 Spec)
    console.log(chalk.bold.hex('#6366f1')(`\nVerya ${VERSION}\n`));
    console.log(chalk.gray('Project:          ') + chalk.bold.white(detected.name));
    console.log(chalk.gray('Framework:        ') + chalk.white(`React + ${detected.language === 'typescript' ? 'TypeScript' : 'JavaScript'}`));
    console.log(chalk.gray('Package manager:  ') + chalk.white(detected.packageManager));
    console.log(chalk.gray('Tailwind CSS:     ') + chalk.white(detected.hasTailwind ? 'Yes' : 'No'));
    console.log(chalk.gray('Files:            ') + chalk.white(`${detected.stats.tsxFiles} components/TSX, ${detected.stats.cssFiles} CSS, ${detected.stats.assetFiles} assets`));
    console.log();

    const veryaPort = parseInt(options.port, 10);

    try {
      await spawnVeryaServer(detected, veryaPort, options.open, options.session, options.verbose);
    } catch (err) {
      console.log();
      console.error(chalk.red('✖ Verya failed to start:'), err instanceof Error ? err.message : String(err));
      if (options.verbose && err instanceof Error) {
        console.error(chalk.dim(err.stack));
      } else {
        console.log(chalk.gray('Tip: Run with --verbose for detailed diagnostic logs.'));
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
