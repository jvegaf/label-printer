const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createStaticServer } = require('../../electron/staticServer');

function makeFixtureDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phomymo-static-test-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<h1>Hello</h1>', 'utf8');
  fs.writeFileSync(path.join(dir, 'app.js'), 'console.log("ok")', 'utf8');
  return dir;
}

async function httpGet(url) {
  const response = await fetch(url);
  const body = await response.text();
  return { status: response.status, body };
}

test('static server serves index and js assets', async () => {
  const root = makeFixtureDir();
  const server = createStaticServer(root);
  const handle = await server.start();

  try {
    const index = await httpGet(`http://127.0.0.1:${handle.port}/`);
    assert.equal(index.status, 200);
    assert.match(index.body, /Hello/);

    const js = await httpGet(`http://127.0.0.1:${handle.port}/app.js`);
    assert.equal(js.status, 200);
    assert.match(js.body, /console\.log/);
  } finally {
    await handle.close();
  }
});

test('static server does not leak files outside web root', async () => {
  const root = makeFixtureDir();
  const server = createStaticServer(root);
  const handle = await server.start();

  try {
    const response = await httpGet(`http://127.0.0.1:${handle.port}/%2e%2e/%2e%2e/etc/passwd`);
    assert.equal(response.status, 404);
  } finally {
    await handle.close();
  }
});
