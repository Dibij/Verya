import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { applyTransform } from './transformer.js';
import type { ProjectInfo } from '../types.js';

let root: string;

function makeProjectInfo(hasTailwind: boolean): ProjectInfo {
  return {
    name: 'fixture',
    root,
    originalRoot: root,
    sessionId: '00000000-0000-4000-8000-000000000000',
    framework: 'react',
    language: 'typescript',
    packageManager: 'npm',
    hasTailwind: hasTailwind,
    hasCSS: true,
    entryFile: path.join(root, 'App.tsx'),
    previewUrl: 'http://localhost:3112',
  };
}

const FIXTURE = `export default function App() {
  return (
    <div className="flex flex-col p-2">
      <span className="text-sm text-gray-500">Hello</span>
      <span className="text-sm text-gray-500">World</span>
    </div>
  );
}
`;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'verya-test-'));
  await fs.writeFile(path.join(root, 'App.tsx'), FIXTURE, 'utf-8');
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('applyTransform', () => {
  it('targets the exact element by source location', async () => {
    const result = await applyTransform(
      {
        file: 'App.tsx',
        selector: { tagName: 'span', source: { line: 4 } },
        changes: [{ property: 'color', value: '#ff0000' }],
      },
      makeProjectInfo(true),
    );

    const lines = result.split('\n');
    const helloLine = lines.find((l) => l.includes('Hello'))!;
    const worldLine = lines.find((l) => l.includes('World'))!;

    expect(helloLine).toContain('text-[#ff0000]');
    expect(worldLine).not.toContain('#ff0000');
  });

  it('falls back to className matching when no source is given', async () => {
    const result = await applyTransform(
      {
        file: 'App.tsx',
        selector: { tagName: 'div', className: 'flex flex-col p-2' },
        changes: [{ property: 'padding', value: '32px' }],
      },
      makeProjectInfo(true),
    );

    expect(result).toContain('p-8');
    expect(result).not.toContain('p-2');
    expect(result).toContain('flex-col');
  });

  it('writes unmappable properties as inline styles instead of dropping them', async () => {
    const result = await applyTransform(
      {
        file: 'App.tsx',
        selector: { tagName: 'div' },
        changes: [
          { property: 'backdropFilter', value: 'blur(20px)' },
          { property: 'cursor', value: 'pointer' },
        ],
      },
      makeProjectInfo(true),
    );

    // 20px is not on Tailwind's blur scale, so it must become an inline style.
    expect(result).toContain('backdropFilter');
    expect(result).toContain('blur(20px)');
    expect(result).toContain('cursor');
    expect(result).toContain('pointer');
  });

  it('rejects paths outside the project root', async () => {
    await expect(
      applyTransform(
        {
          file: '../../../etc/passwd',
          selector: { tagName: 'div' },
          changes: [{ property: 'color', value: 'red' }],
        },
        makeProjectInfo(false),
      ),
    ).rejects.toThrow(/outside of the allowed root/);
  });
});
