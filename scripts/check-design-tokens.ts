import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { findColorLiterals } from '../lib/design/color-literals';

// 走査対象ルートと除外ディレクトリ（spec §⑦）。
const ROOTS = ['app', 'components', 'lib'];
const EXCLUDE_DIRS = ['components/ui', 'app/dev', 'lib/design'];

const isScannable = (p: string) =>
  /\.(ts|tsx)$/.test(p) && !/\.test\.(ts|tsx)$/.test(p);
const isExcluded = (p: string) =>
  EXCLUDE_DIRS.some((d) => p === d || p.startsWith(`${d}/`));

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (isExcluded(full)) continue;
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (isScannable(full)) acc.push(full);
  }
  return acc;
}

let violations = 0;
for (const root of ROOTS) {
  let files: string[] = [];
  try {
    files = walk(root);
  } catch {
    continue;
  }
  for (const file of files) {
    for (const m of findColorLiterals(readFileSync(file, 'utf8'))) {
      violations++;
      console.error(
        `${file}:${m.line}:${m.column}  生の色リテラル "${m.text}" はトークン（var(--…) / Tailwind トークンクラス）に置き換えてください`,
      );
    }
  }
}

if (violations > 0) {
  console.error(
    `\n✗ ${violations} 件の色リテラルを検出（許可: app/globals.css, components/ui/**, app/dev/**）`,
  );
  process.exit(1);
}
console.log('✓ 色リテラルなし（デザイントークンのガードレール通過）');
