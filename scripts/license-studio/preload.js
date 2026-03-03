const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('licenseStudio', {
  getDefaults: () => ipcRenderer.invoke('studio:get-defaults'),
  listUsb: () => ipcRenderer.invoke('studio:list-usb'),
  getMachineFingerprint: () => ipcRenderer.invoke('studio:get-machine-fingerprint'),
  pickPrivateKey: () => ipcRenderer.invoke('studio:pick-private-key'),
  pickOutputPath: () => ipcRenderer.invoke('studio:pick-output-path'),
  issueUsb: payload => ipcRenderer.invoke('studio:issue-usb', payload),
  issueOffline: payload => ipcRenderer.invoke('studio:issue-offline', payload),
});
