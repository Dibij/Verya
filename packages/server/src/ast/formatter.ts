import prettier from 'prettier';

export async function formatCode(content: string, filePath: string): Promise<string> {
  try {
    const config = await prettier.resolveConfig(filePath);
    const formatted = await prettier.format(content, {
      ...(config ?? {}),
      filepath: filePath,
      parser:
        filePath.endsWith('.tsx') || filePath.endsWith('.ts') ? 'babel-ts' : 'babel',
    });
    return formatted;
  } catch {
    // If prettier fails, return unformatted content
    return content;
  }
}
