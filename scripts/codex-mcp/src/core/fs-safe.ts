import * as fs from 'node:fs';
import * as path from 'node:path';

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, {recursive: true});
}

export function isInside(baseDir: string, targetPath: string): boolean {
  const base = path.resolve(baseDir);
  const target = path.resolve(targetPath);
  const relative = path.relative(base, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function requireInside(baseDir: string, targetPath: string): string {
  const resolved = path.resolve(targetPath);
  if (!isInside(baseDir, resolved)) {
    throw new Error(`Path escapes allowed root: ${targetPath}`);
  }
  return resolved;
}

export function readUtf8(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

export function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function listFilesRecursive(rootDir: string, extensions: Set<string>): string[] {
  const results: string[] = [];
  if (!fs.existsSync(rootDir)) return results;

  const visit = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
          continue;
        }
        visit(fullPath);
      } else if (entry.isFile() && extensions.has(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  };

  visit(rootDir);
  return results.sort();
}

export function appendJsonLine(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, 'utf8');
}

export function readJsonLines(filePath: string): Record<string, unknown>[] {
  if (!fileExists(filePath)) return [];
  return readUtf8(filePath)
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}
