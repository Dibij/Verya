import * as babelParser from '@babel/parser';
import type * as t from '@babel/types';
import fs from 'fs/promises';

export async function parseFile(filePath: string): Promise<{
  ast: ReturnType<typeof babelParser.parse>;
  content: string;
}> {
  const content = await fs.readFile(filePath, 'utf-8');
  const ast = babelParser.parse(content, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });
  return { ast, content };
}

export type { t };
