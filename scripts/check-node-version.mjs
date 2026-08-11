const minimum = [22, 13, 0];
const current = process.versions.node.split(".").map(Number);
const supported =
  current[0] > minimum[0] ||
  (current[0] === minimum[0] && current[1] > minimum[1]) ||
  (current[0] === minimum[0] && current[1] === minimum[1] && current[2] >= minimum[2]);

if (!supported) {
  console.error(`\nWhisper requires Node.js 22.13.0 or newer. You are using Node.js ${process.version}.\n\nRun:\n  nvm install 22\n  nvm use\n  npm install\n`);
  process.exit(1);
}
