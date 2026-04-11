const path = require('node:path');
const { app, BrowserWindow, dialog, session } = require('electron');
const { createStaticServer } = require('./staticServer');
const {
  loadGrantedDevices,
  saveGrantedDevices,
  grantDevice,
  isDeviceGranted,
} = require('./devicePermissions');

const BLUETOOTH_NAME_PREFIXES = ['M', 'D', 'P', 'Q', 'T', 'A', 'Mr.in', 'Phomemo'];

let staticServerHandle = null;
let mainWindow = null;
let grantedUSBDevicesByOrigin = {};

function isAppOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost';
  } catch {
    return false;
  }
}

function setupUSBPermissions() {
  const userDataPath = app.getPath('userData');
  grantedUSBDevicesByOrigin = loadGrantedDevices(userDataPath);

  session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    if (permission === 'usb' || permission === 'bluetooth') {
      return isAppOrigin(requestingOrigin);
    }
    return false;
  });

  session.defaultSession.setDevicePermissionHandler((details) => {
    if (details.deviceType !== 'usb') return false;
    if (!isAppOrigin(details.origin)) return false;
    return isDeviceGranted(grantedUSBDevicesByOrigin, details.origin, details.device);
  });

  session.defaultSession.on('select-usb-device', async (event, details, callback) => {
    event.preventDefault();

    if (!mainWindow || details.deviceList.length === 0) {
      callback();
      return;
    }

    const buttons = details.deviceList.map((device, index) => {
      const label = device.productName || `USB device ${index + 1}`;
      return `${label} (${device.vendorId.toString(16)}:${device.productId.toString(16)})`;
    });
    buttons.push('Cancel');

    const selection = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Select USB printer',
      message: 'Choose a USB device for Phomymo',
      buttons,
      cancelId: buttons.length - 1,
      noLink: true,
    });

    if (selection.response >= details.deviceList.length) {
      callback();
      return;
    }

    const selectedDevice = details.deviceList[selection.response];
    grantDevice(grantedUSBDevicesByOrigin, details.origin, selectedDevice);
    saveGrantedDevices(userDataPath, grantedUSBDevicesByOrigin);
    callback(selectedDevice.deviceId);
  });
}

function setupBluetoothSelection() {
  app.on('web-contents-created', (_event, webContents) => {
    webContents.on('select-bluetooth-device', async (event, deviceList, callback) => {
      event.preventDefault();

      if (!mainWindow || deviceList.length === 0) {
        callback('');
        return;
      }

      const sorted = [...deviceList].sort((a, b) => {
        const aPreferred = BLUETOOTH_NAME_PREFIXES.some((prefix) => (a.deviceName || '').startsWith(prefix));
        const bPreferred = BLUETOOTH_NAME_PREFIXES.some((prefix) => (b.deviceName || '').startsWith(prefix));
        if (aPreferred === bPreferred) return 0;
        return aPreferred ? -1 : 1;
      });

      const buttons = sorted.map((device, index) => `${device.deviceName || `Bluetooth device ${index + 1}`}`);
      buttons.push('Cancel');

      const selection = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: 'Select Bluetooth printer',
        message: 'Choose a Bluetooth device for Phomymo',
        buttons,
        cancelId: buttons.length - 1,
        noLink: true,
      });

      if (selection.response >= sorted.length) {
        callback('');
        return;
      }

      callback(sorted[selection.response].deviceId);
    });
  });
}

async function createMainWindow() {
  if (!staticServerHandle) {
    const staticRoot = path.resolve(__dirname, '..', 'src', 'web');
    const server = createStaticServer(staticRoot);
    staticServerHandle = await server.start();
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Phomymo',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(`http://127.0.0.1:${staticServerHandle.port}`);

  if (process.argv.includes('--smoke-test')) {
    setTimeout(() => app.quit(), 1200);
  }
}

app.whenReady().then(async () => {
  setupUSBPermissions();
  setupBluetoothSelection();
  await createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  if (staticServerHandle) {
    await staticServerHandle.close();
    staticServerHandle = null;
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});
