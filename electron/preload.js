const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktopInfo', {
  isElectron: true,
});
