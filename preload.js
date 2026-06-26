const { contextBridge, ipcRenderer } = require('electron');

let packageVersion = '';
try {
  packageVersion = String((require('./package.json') || {}).version || '').trim();
} catch (error) {
  packageVersion = '';
}

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, payload) => ipcRenderer.send(channel, payload),
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
  getAppVersionSync: () => packageVersion,
  on: (channel, listener) => {
    const wrapped = (_event, ...args) => listener(...args);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },
});
