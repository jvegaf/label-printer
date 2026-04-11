const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  getDeviceKey,
  loadGrantedDevices,
  saveGrantedDevices,
  grantDevice,
  isDeviceGranted,
} = require('../../electron/devicePermissions');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'phomymo-perm-test-'));
}

test('getDeviceKey builds stable key with serial', () => {
  const key = getDeviceKey({ vendorId: 1155, productId: 22352, serialNumber: 'ABC' });
  assert.equal(key, '1155:22352:ABC');
});

test('grantDevice + isDeviceGranted work by origin and usb identity', () => {
  const store = {};
  const origin = 'http://127.0.0.1:9999';
  const device = { vendorId: 1155, productId: 22352, serialNumber: 'ABC' };

  assert.equal(isDeviceGranted(store, origin, device), false);
  grantDevice(store, origin, device);
  assert.equal(isDeviceGranted(store, origin, device), true);
  assert.equal(isDeviceGranted(store, 'http://localhost:9999', device), false);
});

test('load/save persists granted devices to disk', () => {
  const dir = makeTmpDir();
  const origin = 'http://127.0.0.1:5555';
  const device = { vendorId: 1, productId: 2, serialNumber: '3' };

  const store = loadGrantedDevices(dir);
  grantDevice(store, origin, device);
  saveGrantedDevices(dir, store);

  const reloaded = loadGrantedDevices(dir);
  assert.equal(isDeviceGranted(reloaded, origin, device), true);
});
