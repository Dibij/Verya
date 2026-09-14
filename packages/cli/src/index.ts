#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { detectProject } from './detect.js';
import { spawnVeryaServer } from './spawn.js';
import { sessionManager } from '@verya/server';

const BANNER = chalk.bold.hex('#6366f1')(`
 __   _____ ____  _   _   _   
 \\ \\ / / __| __ )\\ \\ / / /_\\  
  \\ V /| _||    \\ \\ V / / _ \\ 
   \\_/ |___|_||_|  |_| /_/ \\_\\
`) + chalk.gray(' Visual editing for real code.\n');

const program = new Command();

program
  .name('verya')
  .description('Verya — Visual editing for real code')
  .version('0.1.0')
  .argument('[path]', 'Path to your React project (directory or entry file)', '.')
  .option('-p, --port <port>', 'Port for the Verya server', '3111')
  .option('-s, --session <id>', 'Resume a specific editing session')
  .option('--list-sessions', 'List existing sessions for this project')
  .option('--no-open', 'Do not open browser automatically')
  .action(async (projectPath: string, options: { port: string; session?: string; listSessions?: boolean; open: boolean }) => {
    console.log(BANNER);

    const targetDir = path.resolve(projectPath);

    if (options.listSessions) {
      try {
        const sessions = await sessionManager.listSessions(targetDir);
        if (sessions.length === 0) {
          console.log(chalk.yellow(`No previous sessions found for ${targetDir}`));
        } else {
          console.log(chalk.bold(`Previous sessions for ${targetDir}:`));
          for (const s of sessions) {
            console.log(
              chalk.cyan(`• ${s.name}`) +
              chalk.gray(` (${s.id})`) +
              chalk.white(` - ${s.modifiedFiles.length} file(s) modified - `) +
              chalk.gray(new Date(s.updatedAt).toLocaleString())
            );
          }
        }
        process.exit(0);
      } catch (err) {
        console.error(chalk.red('✖ Failed to list sessions:'), err);
        process.exit(1);
      }
    }

    let detected;
    try {
      detected = await detectProject(projectPath);
    } catch (err) {
      console.error(chalk.red('✖ Project detection failed:'), err instanceof Error ? err.message : String(err));
      process.exit(1);
    }

    const veryaPort = parseInt(options.port, 10);

    console.log(chalk.gray('Project:        ') + chalk.bold.white(detected.name));
    console.log(chalk.gray('Framework:      ') + chalk.white(`React (${detected.language === 'typescript' ? 'TypeScript' : 'JavaScript'})`));
    console.log(chalk.gray('Package Manager:') + chalk.white(` ${detected.packageManager}`));
    console.log(chalk.gray('Tailwind CSS:   ') + chalk.white(detected.hasTailwind ? 'Yes' : 'No'));
    console.log(chalk.gray('Files Detected: ') + chalk.white(`${detected.stats.tsxFiles} TSX/JSX, ${detected.stats.cssFiles} CSS, ${detected.stats.assetFiles} assets`));
    console.log();

    try {
      await spawnVeryaServer(detected, veryaPort, options.open, options.session);
    } catch (err) {
      console.error(chalk.red('✖ Failed to start Verya:'), err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program.parse(process.argv);
