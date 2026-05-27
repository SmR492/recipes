// Flatten-Generator für das moderne Symfony-Flex-Endpoint-Format.
// Liest die Recipe-Quellen unter smr492/<bundle>/<version>/ (manifest.json + Dateibaum)
// und erzeugt:
//   - index.json                          (recipes-Liste + _links + branch)
//   - <package_dotted>.<version>.json      (Per-Recipe-Manifest INKL. files/ref)
//
// Hintergrund: Bei konfiguriertem extra.symfony.endpoint liest Flex NUR recipes/_links
// aus dem Index und lädt Manifest+files separat (Downloader.php). Das alte flache
// {"manifests":…} wird dann ignoriert (Issue #4).
//
// Aufruf: node flatten.mjs [branch]   (branch nur informativ; Auslieferung ist branch-relativ)
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const BRANCH = process.argv[2] || 'main';
const VENDORS = readdirSync(ROOT).filter((d) => statSync(join(ROOT, d)).isDirectory() && !d.startsWith('.'));

const walk = (dir) => readdirSync(dir).flatMap((e) => {
  const p = join(dir, e);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const recipes = {};
const perRecipe = {};

for (const vendor of VENDORS) {
  const vendorDir = join(ROOT, vendor);
  for (const bundle of readdirSync(vendorDir)) {
    const bundleDir = join(vendorDir, bundle);
    if (!statSync(bundleDir).isDirectory()) continue;
    const pkg = `${vendor}/${bundle}`;
    for (const version of readdirSync(bundleDir)) {
      const verDir = join(bundleDir, version);
      if (!statSync(verDir).isDirectory()) continue;
      const manifestPath = join(verDir, 'manifest.json');
      let manifest;
      try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch { continue; }

      const files = {};
      for (const f of walk(verDir)) {
        if (f === manifestPath) continue;
        const rel = relative(verDir, f).split('\\').join('/');
        files[rel] = { contents: readFileSync(f, 'utf8').split('\n'), executable: false };
      }

      (recipes[pkg] ??= []).push(version);
      const ref = createHash('sha1').update(JSON.stringify({ manifest, files })).digest('hex').slice(0, 12);
      const dotted = pkg.replace('/', '.');
      perRecipe[`${dotted}.${version}.json`] = {
        manifests: { [pkg]: { manifest, files, ref } },
      };
    }
    if (recipes[pkg]) recipes[pkg].sort();
  }
}

const index = {
  recipes,
  branch: BRANCH,
  is_contrib: true,
  _links: {
    repository: 'github.com/SmR492/recipes',
    origin_template: '{package}:{version}@github.com/SmR492/recipes',
    recipe_template: `https://raw.githubusercontent.com/SmR492/recipes/${BRANCH}/{package_dotted}.{version}.json`,
    // branch-relativ: Flex ersetzt das letzte Pfadsegment des konfigurierten Endpoints
    // (…/<branch>/index.json) durch dieses Template → funktioniert auf main UND develop.
    recipe_template_relative: '{package_dotted}.{version}.json',
  },
};

writeFileSync(join(ROOT, 'index.json'), JSON.stringify(index, null, 4) + '\n');
for (const [name, body] of Object.entries(perRecipe)) {
  writeFileSync(join(ROOT, name), JSON.stringify(body, null, 4) + '\n');
}
console.log(JSON.stringify({ recipes, generated: ['index.json', ...Object.keys(perRecipe)] }, null, 2));
