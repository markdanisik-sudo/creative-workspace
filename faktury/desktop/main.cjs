// Faktury for Mac: runs the app's server in the background (data in
// ~/Library/Application Support/Faktury) and shows it in a window.
const { app, BrowserWindow, Menu, dialog, nativeTheme, session, shell, utilityProcess } = require("electron");
const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const SERVER_DIR = app.isPackaged
  ? path.join(process.resourcesPath, "server")
  : path.join(__dirname, "..", ".next", "standalone");

let server = null;
let origin = null;
let quitting = false;

if (!app.requestSingleInstanceLock()) app.quit();

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function waitUntilReady(url, token, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { headers: { cookie: `faktury_token=${token}` }, redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("The server did not start in time.");
}

async function startServer() {
  const dataDir = app.getPath("userData");
  fs.mkdirSync(dataDir, { recursive: true });
  const port = await freePort();
  // A fresh secret per launch: only this app's window may use the server.
  const token = crypto.randomBytes(32).toString("hex");
  origin = `http://127.0.0.1:${port}`;

  const log = fs.createWriteStream(path.join(dataDir, "server.log"), { flags: "w" });
  server = utilityProcess.fork(path.join(SERVER_DIR, "server.js"), [], {
    cwd: SERVER_DIR,
    serviceName: "Faktury",
    stdio: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "production",
      NODE_NO_WARNINGS: "1",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      FAKTURY_STORE: "local",
      FAKTURY_DB: path.join(dataDir, "faktury.sqlite"),
      FAKTURY_LOCAL_TOKEN: token,
    },
  });
  server.stdout?.pipe(log);
  server.stderr?.pipe(log);
  server.on("exit", (code) => {
    if (!quitting) {
      dialog.showErrorBox(
        "Faktury",
        `Aplikace se neočekávaně zastavila (kód ${code}). Podrobnosti: ${path.join(dataDir, "server.log")}`,
      );
      app.quit();
    }
  });

  await session.defaultSession.cookies.set({
    url: origin,
    name: "faktury_token",
    value: token,
    httpOnly: true,
    sameSite: "strict",
  });
  await waitUntilReady(`${origin}/`, token);
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 400,
    minHeight: 500,
    title: "Faktury",
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0e0e0d" : "#ecebe8",
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  window.once("ready-to-show", () => window.show());

  // Links to the outside world open in the browser, never inside the app.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(origin)) {
      event.preventDefault();
      if (url.startsWith("https://")) void shell.openExternal(url);
    }
  });

  void window.loadURL(`${origin}/`);
  return window;
}

function go(pathname) {
  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? createWindow();
  void window.loadURL(`${origin}${pathname}`);
}

function buildMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: "appMenu" },
      {
        label: "Soubor",
        submenu: [
          { label: "Nová faktura", accelerator: "CmdOrCtrl+N", click: () => go("/faktury/nova") },
          { label: "Import z iDokladu…", accelerator: "CmdOrCtrl+I", click: () => go("/import") },
          { type: "separator" },
          { label: "Zálohovat…", click: () => go("/zaloha") },
          { type: "separator" },
          { label: "Tisk / PDF…", accelerator: "CmdOrCtrl+P", click: () => BrowserWindow.getFocusedWindow()?.webContents.print() },
          { role: "close", label: "Zavřít okno" },
        ],
      },
      { role: "editMenu", label: "Úpravy" },
      {
        label: "Zobrazit",
        submenu: [
          { label: "Přehled", accelerator: "CmdOrCtrl+1", click: () => go("/") },
          { label: "Faktury", accelerator: "CmdOrCtrl+2", click: () => go("/faktury") },
          { label: "Kontakty", accelerator: "CmdOrCtrl+3", click: () => go("/kontakty") },
          { label: "Nastavení", accelerator: "CmdOrCtrl+,", click: () => go("/nastaveni") },
          { type: "separator" },
          { role: "reload", label: "Načíst znovu" },
          { role: "resetZoom", label: "Skutečná velikost" },
          { role: "zoomIn", label: "Zvětšit" },
          { role: "zoomOut", label: "Zmenšit" },
          { type: "separator" },
          { role: "togglefullscreen", label: "Celá obrazovka" },
        ],
      },
      { role: "windowMenu", label: "Okno" },
    ]),
  );
}

app.on("second-instance", () => {
  const window = BrowserWindow.getAllWindows()[0];
  if (window) {
    if (window.isMinimized()) window.restore();
    window.focus();
  }
});

app.whenReady().then(async () => {
  buildMenu();
  try {
    await startServer();
  } catch (error) {
    dialog.showErrorBox("Faktury", `Aplikaci se nepodařilo spustit: ${error.message}`);
    app.quit();
    return;
  }
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  quitting = true;
  server?.kill();
});
