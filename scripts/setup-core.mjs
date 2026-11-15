// Installs @surea11y/core from its main branch, beside this repository
// (../core), until the next release: the plugin uses rules that 1.17.0 lacks.
// Clones it the first time and updates it after that. Run it again after
// `npm install`, which puts the released version back.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const core = path.resolve(root, '..', 'core');

function run(command, args, cwd) {
  console.log(`> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

if (existsSync(path.join(core, '.git'))) {
  run('git', ['pull', '--ff-only'], core);
} else {
  run('git', ['clone', 'https://github.com/SureA11y/core.git', core], root);
}
run('npm', ['install', '--no-save', core], root);
console.log(`@surea11y/core now comes from ${core}.`);
