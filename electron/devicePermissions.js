const fs = require('node:fs');
const path = require('node:path');

const PERMISSIONS_FILE = 'usb-permissions.json';

function getPermissionsPath(userDataPath) {
  return path.join(userDataPath, PERMISSIONS_FILE);
}

function getDeviceKey(device) {
  const vendorId = device.vendorId ?? 'unknown-vendor';
  const productId = device.productId ?? 'unknown-product';
  const serialNumber = device.serialNumber ?? 'unknown-serial';
  return `${vendorId}:${productId}:${serialNumber}`;
}

function loadGrantedDevices(userDataPath) {
  const filePath = getPermissionsPath(userDataPath);
  if (!fs.existsSync(filePath)) return {};

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveGrantedDevices(userDataPath, grantedDevices) {
  const filePath = getPermissionsPath(userDataPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(grantedDevices, null, 2), 'utf8');
}

function grantDevice(store, origin, device) {
  const normalizedOrigin = String(origin || '');
  if (!store[normalizedOrigin]) {
    store[normalizedOrigin] = {};
  }
  store[normalizedOrigin][getDeviceKey(device)] = true;
}

function isDeviceGranted(store, origin, device) {
  const normalizedOrigin = String(origin || '');
  const originStore = store[normalizedOrigin];
  if (!originStore) return false;
  return !!originStore[getDeviceKey(device)];
}

module.exports = {
  getPermissionsPath,
  getDeviceKey,
  loadGrantedDevices,
  saveGrantedDevices,
  grantDevice,
  isDeviceGranted,
};
