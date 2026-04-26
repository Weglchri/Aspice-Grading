const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const stateFile = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf-8')); }
  catch { return {}; }
}

function saveWindowState(win) {
  const bounds = win.getBounds();
  fs.writeFileSync(stateFile, JSON.stringify({ ...bounds, maximized: win.isMaximized() }));
}

function createWindow() {
  const s = loadWindowState();
  const win = new BrowserWindow({
    width: s.width || 1280,
    height: s.height || 800,
    x: s.x,
    y: s.y,
    minWidth: 900,
    minHeight: 600,
    title: 'APIT',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (s.maximized) win.maximize();
  win.on('close', () => saveWindowState(win));
  win.loadFile('index.html');
  return win;
}

function buildMenu(win) {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Import Report…', accelerator: 'CmdOrCtrl+O', click: () => win.webContents.send('menu-import') },
        { label: 'Export Report…', accelerator: 'CmdOrCtrl+S', click: () => win.webContents.send('menu-export') },
        { label: 'Export PDF…', accelerator: 'CmdOrCtrl+Shift+E', click: () => win.webContents.send('menu-export-pdf') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { label: 'Evaluate', accelerator: 'CmdOrCtrl+1', click: () => win.webContents.send('menu-view', 'evaluate') },
        { label: 'Review', accelerator: 'CmdOrCtrl+2', click: () => win.webContents.send('menu-view', 'review') },
        { label: 'Summary', accelerator: 'CmdOrCtrl+3', click: () => win.webContents.send('menu-view', 'summary') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About APIT', click: () => {
          dialog.showMessageBox(win, {
            type: 'info',
            title: 'About APIT',
            message: 'Automotive Process Improvement Tool',
            detail: `ASPICE 3.1 grading tool\nVersion ${app.getVersion()}\nDeveloped by Christopher Wegl`,
          });
        }},
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'JSON Reports', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (result.canceled) return null;
  return fs.readFileSync(result.filePaths[0], 'utf-8');
});

ipcMain.handle('dialog:saveFile', async (_event, { data, defaultName }) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled) return false;
  fs.writeFileSync(result.filePath, data);
  return true;
});

ipcMain.handle('dialog:savePDF', async (_event, { buffer, defaultName }) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (result.canceled) return false;
  fs.writeFileSync(result.filePath, Buffer.from(buffer));
  return true;
});

app.whenReady().then(() => {
  const win = createWindow();
  buildMenu(win);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const w = createWindow();
      buildMenu(w);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
