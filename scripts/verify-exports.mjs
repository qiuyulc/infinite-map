import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const pkgs = ['packages/infinite-map', 'packages/infinite-map-editor'];

function ensureFileExists(absPath, hint) {
  if (!fs.existsSync(absPath)) {
    throw new Error(`[verify-exports] missing file: ${path.relative(repoRoot, absPath)} (${hint})`);
  }
}

function verifyPackageExports(pkgDir) {
  const pkgJsonPath = path.join(repoRoot, pkgDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

  if (!pkg.exports) {
    console.log(`[verify-exports] skip ${pkg.name}: no exports`);
    return;
  }

  for (const [key, value] of Object.entries(pkg.exports)) {
    const entries = typeof value === 'string' ? { default: value } : value;
    if (!entries || typeof entries !== 'object') continue;
    for (const [cond, target] of Object.entries(entries)) {
      if (typeof target !== 'string') continue;
      if (target.includes('*')) continue; // pattern export：由 build 产物覆盖，难以枚举
      const abs = path.join(repoRoot, pkgDir, target);
      ensureFileExists(abs, `${pkg.name} export "${key}" (${cond})`);
    }
  }

  console.log(`[verify-exports] ok: ${pkg.name}`);
}

for (const p of pkgs) verifyPackageExports(p);

