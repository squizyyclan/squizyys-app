const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Adresse der Website steht in config.json (oder wird beim Bauen über die GitHub-Variable SITE_URL gesetzt)
let SITE = '';
try { SITE = String(JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')).url || '').trim(); } catch {}
let ORIGIN = '';
try { ORIGIN = new URL(SITE).origin; } catch {}

if (!app.requestSingleInstanceLock()) app.quit();

// Im Fenster bleiben: die eigene Website und die Discord-Anmeldung. Alles andere öffnet im normalen Browser.
function stayInApp(url) {
  try {
    const u = new URL(url);
    return u.origin === ORIGIN || u.hostname === 'discord.com' || u.hostname === 'www.discord.com';
  } catch { return false; }
}
function openOutside(url) {
  try { if (/^https?:$/.test(new URL(url).protocol)) shell.openExternal(url); } catch {}
}

function showOffline(win) {
  win.loadFile(path.join(__dirname, 'offline.html'), { query: { u: SITE } });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 420, minHeight: 600,
    backgroundColor: '#090b0f', autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('file:')) return;
    if (!stayInApp(url)) { e.preventDefault(); openOutside(url); }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (stayInApp(url)) win.loadURL(url); else openOutside(url);
    return { action: 'deny' };
  });
  win.webContents.on('did-fail-load', (_e, code, _d, _url, isMainFrame) => {
    if (isMainFrame && code !== -3) showOffline(win); // -3 = abgebrochen (normal bei Weiterleitungen)
  });
  if (ORIGIN) win.loadURL(SITE); else showOffline(win);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => app.quit());
