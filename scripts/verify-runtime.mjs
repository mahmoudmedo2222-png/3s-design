const requiredNodeMajor = 22;
const strict = process.argv.includes('--strict');
const currentVersion = process.versions.node;
const currentMajor = Number.parseInt(currentVersion.split('.')[0] ?? '', 10);

if (currentMajor === requiredNodeMajor) {
  console.log(`Runtime check passed: Node ${currentVersion}`);
  process.exit(0);
}

const message = [
  `Runtime check ${strict ? 'failed' : 'warning'}: Node ${currentVersion} is active.`,
  `3S Design production gates are pinned to Node ${requiredNodeMajor}.x because local Node 24 builds have shown unstable Next/Windows behavior.`,
  'Switch runtime before release checks, for example: nvm use, fnm use, or another Node 22.x manager.',
].join('\n');

if (strict) {
  console.error(message);
  process.exit(1);
}

console.warn(message);
