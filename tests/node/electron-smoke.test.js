const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

test('electron app boots in smoke mode', { skip: !process.env.RUN_ELECTRON_SMOKE }, async () => {
  const electronBinary = require('electron');

  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(electronBinary, ['.', '--smoke-test'], {
      stdio: 'ignore',
      env: {
        ...process.env,
        ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
      },
    });

    child.on('error', reject);
    child.on('exit', (code) => resolve(code));
  });

  assert.equal(exitCode, 0);
});
