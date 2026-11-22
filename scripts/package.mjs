// Packages the WordPress plugin as it is uploaded to WordPress.org:
// dist/surea11y-<version>.zip, holding a `surea11y/` folder with the plugin's
// PHP, its scripts and styles, the readme, and the built engine and panel
// (build/, which is not in git).
//
// Before packaging, it checks what a release needs:
// - the version is the same in the plugin header, SUREA11Y_VERSION and the
//   readme's Stable tag;
// - @surea11y/core is a released version from npm, not a local copy linked
//   into node_modules (pass --allow-unreleased-core to package anyway, for
//   a test; the zip is then named so);
// then builds, and checks the size budgets.
//
//   npm run package
//   npm run package -- --allow-unreleased-core
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plugin = path.join(root, 'plugins/wordpress');
const dist = path.join(root, 'dist');
const allowUnreleased = process.argv.includes('--allow-unreleased-core');

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) fail(`${command} ${args.join(' ')} failed.`);
}

// The version, the same in all three places.
const main = fs.readFileSync(path.join(plugin, 'surea11y.php'), 'utf8');
const readme = fs.readFileSync(path.join(plugin, 'readme.txt'), 'utf8');
const versions = {
  'surea11y.php "Version:"': (main.match(/^\s*\*\s*Version:\s*(\S+)/m) || [])[1],
  SUREA11Y_VERSION: (main.match(/define\(\s*'SUREA11Y_VERSION',\s*'([^']+)'/) || [])[1],
  'readme.txt "Stable tag:"': (readme.match(/^Stable tag:\s*(\S+)/m) || [])[1]
};
const version = versions['surea11y.php "Version:"'];
if (!version || Object.values(versions).some((v) => v !== version)) {
  fail(
    `The version differs between the files:\n${Object.entries(versions)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n')}`
  );
}

// A released core: installed from npm, not linked to a local copy.
const coreDir = path.join(root, 'node_modules/@surea11y/core');
const coreLinked = fs.existsSync(coreDir) && fs.lstatSync(coreDir).isSymbolicLink();
const coreVersion = JSON.parse(fs.readFileSync(path.join(coreDir, 'package.json'), 'utf8')).version;
if (coreLinked && !allowUnreleased) {
  fail(
    `@surea11y/core comes from a local copy (${fs.realpathSync(coreDir)}), not a release.\n` +
      'Install a released core (npm install), or pass --allow-unreleased-core for a test package.'
  );
}

run(process.execPath, ['scripts/build.mjs']);
run(process.execPath, ['scripts/check-size.mjs']);

// What goes in: the plugin as WordPress loads it, without the developer README.
const INCLUDE = ['surea11y.php', 'uninstall.php', 'readme.txt', 'includes', 'src', 'build'];
const stage = path.join(dist, 'stage');
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(path.join(stage, 'surea11y'), { recursive: true });
for (const entry of INCLUDE) {
  fs.cpSync(path.join(plugin, entry), path.join(stage, 'surea11y', entry), { recursive: true });
}

const name = `surea11y-${version}${coreLinked ? '-unreleased-core' : ''}.zip`;
const zip = path.join(dist, name);
fs.rmSync(zip, { force: true });
const zipped = spawnSync('zip', ['-r', '-X', '-q', zip, 'surea11y'], {
  cwd: stage,
  stdio: 'inherit'
});
if (zipped.status !== 0) fail('zip failed (is the zip command installed?).');
fs.rmSync(stage, { recursive: true, force: true });

const files = spawnSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).stdout.trim().split('\n');
console.log(
  `\n${path.relative(root, zip)}: ${(fs.statSync(zip).size / 1024).toFixed(0)} KB, ` +
    `${files.filter((f) => !f.endsWith('/')).length} files; plugin ${version}, core ${coreVersion}` +
    `${coreLinked ? ' (a local copy: not for release)' : ''}.`
);
