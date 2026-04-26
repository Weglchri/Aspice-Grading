const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (data) => ipcRenderer.invoke('dialog:saveFile', data),
  savePDF: (data) => ipcRenderer.invoke('dialog:savePDF', data),
  onMenuImport: (cb) => ipcRenderer.on('menu-import', cb),
  onMenuExport: (cb) => ipcRenderer.on('menu-export', cb),
  onMenuExportPDF: (cb) => ipcRenderer.on('menu-export-pdf', cb),
  onMenuView: (cb) => ipcRenderer.on('menu-view', (_event, view) => cb(view)),
});
