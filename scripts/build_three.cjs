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
  // npm is run as the JavaScript file it is, through this node, so no shell
  // ever joins the arguments (npm.cmd on Windows would need one).
  // Package install scripts never run: esbuild works from its platform
  // package without its postinstall, and nothing else needs one.
  const nodeDir = path.dirname(process.execPath);
  const npmCli = [process.env.npm_execpath, path.join(nodeDir, 'node_modules/npm/bin/npm-cli.js'),
    path.join(nodeDir, '../lib/node_modules/npm/bin/npm-cli.js')].find((p) => p && p.endsWith('.js') && fs.existsSync(p));
  if (!npmCli) throw new Error('cannot find npm-cli.js next to this node');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'three-'));
  try {
    execFileSync(process.execPath, [npmCli, 'install', '--no-save', '--ignore-scripts', '--prefix', dir, 'three@0.170.0', 'esbuild@0.24.0'], { stdio: 'inherit' });
    const lock = JSON.parse(fs.readFileSync(path.join(dir, 'node_modules/.package-lock.json'), 'utf8')).packages;
    for (const [name, integrity] of Object.entries(INTEGRITY)) {
      if (lock[`node_modules/${name}`]?.integrity !== integrity) throw new Error(`${name} integrity mismatch: got ${lock[`node_modules/${name}`]?.integrity}`);
    }
    fs.writeFileSync(path.join(dir, 'entry.js'), `export { ${EXPORTS.join(', ')} } from 'three';\n`);
    const out = path.resolve(__dirname, '../dist/vendor/three.hero.min.js');
    execFileSync(process.execPath, [path.join(dir, 'node_modules/esbuild/bin/esbuild'), path.join(dir, 'entry.js'),
      '--bundle', '--minify', '--format=esm', '--legal-comments=none', `--outfile=${out}`], { stdio: 'inherit' });
    fs.writeFileSync(out, '/* Three.js r170 (MIT, Three.js Authors), subset built by scripts/build_three.cjs */\n' + fs.readFileSync(out, 'utf8').trimEnd() + '\n');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
