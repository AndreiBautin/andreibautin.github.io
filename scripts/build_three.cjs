// Rebuilds dist/vendor/three.hero.min.js: only the Three.js exports hero.js
// uses, so the browser downloads and parses a fraction of the full module.
// Run with: node scripts/build_three.cjs (needs network for npx, once).
// Add an export here when hero.js starts using a new THREE.* name; verify
// fails if the two lists disagree.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const EXPORTS = ['CanvasTexture', 'CircleGeometry', 'DirectionalLight', 'Group', 'HemisphereLight',
  'IcosahedronGeometry', 'MathUtils', 'Mesh', 'MeshBasicMaterial', 'MeshStandardMaterial',
  'PerspectiveCamera', 'PointLight', 'Quaternion', 'Raycaster', 'SRGBColorSpace', 'Scene',
  'Vector2', 'Vector3', 'WebGLRenderer'];
// npm's published integrity for the exact packages the subset is built
// from. A rebuild refuses anything else, so the vendored file is traceable to
// these two tarballs.
const INTEGRITY = {
  three: 'sha512-FQK+LEpYc0fBD+J8g6oSEyyNzjp+Q7Ks1C568WWaoMRLW+TkNNWmenWeGgJjV105Gd+p/2ql1ZcjYvNiPZBhuQ==',
  esbuild: 'sha512-FuLPevChGDshgSicjisSooU0cemp/sGXR841D5LHMB7mTVOmsEHcAxaH3irL53+8YDIeVNQEySh4DaYU/iuPqQ==',
};
module.exports = { EXPORTS };
if (require.main === module) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'three-'));
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  execFileSync(npm, ['install', '--no-save', '--prefix', dir, 'three@0.170.0', 'esbuild@0.24.0'], { stdio: 'inherit', shell: true });
  const lock = JSON.parse(fs.readFileSync(path.join(dir, 'node_modules/.package-lock.json'), 'utf8')).packages;
  for (const [name, integrity] of Object.entries(INTEGRITY)) {
    if (lock[`node_modules/${name}`]?.integrity !== integrity) throw new Error(`${name} integrity mismatch: got ${lock[`node_modules/${name}`]?.integrity}`);
  }
  fs.writeFileSync(path.join(dir, 'entry.js'), `export { ${EXPORTS.join(', ')} } from 'three';\n`);
  const out = path.resolve(__dirname, '../dist/vendor/three.hero.min.js');
  execFileSync(process.execPath, [path.join(dir, 'node_modules/esbuild/bin/esbuild'), path.join(dir, 'entry.js'),
    '--bundle', '--minify', '--format=esm', '--legal-comments=none', `--outfile=${out}`], { stdio: 'inherit' });
  fs.writeFileSync(out, '/* Three.js r170 (MIT, Three.js Authors), subset built by scripts/build_three.cjs */\n' + fs.readFileSync(out, 'utf8').trimEnd() + '\n');
  fs.rmSync(dir, { recursive: true, force: true });
}
