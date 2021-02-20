const { createServer } = require('vite');
const { spawn } = require('child_process');
const path = require('path');
const electron = require('electron');

async function main() {
  const server = await createServer({
    root: __dirname
  });

  await server.listen();

  spawn(
    electron,
    [path.join(__dirname, './index.js'), 'dev-mode'],
    { stdio: 'inherit' }
  ).on('close', process.exit);
}

main();
