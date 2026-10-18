// Processo principal do OdontoClinic: janela, banco de dados local e backup.
const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require("electron");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { open, api } = require("./db.cjs");

const devUrl = process.env.VITE_DEV_SERVER_URL || "";
const root = path.join(__dirname, "..");
if (process.env.ODONTO_USER_DATA) app.setPath("userData", process.env.ODONTO_USER_DATA);

const dataDir = () => path.join(app.getPath("userData"), "dados");
const dbFile = () => path.join(dataDir(), "clinica.db");

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1340, height: 860, minWidth: 1000, minHeight: 640, backgroundColor: "#f4f6fb", title: "OdontoClinic",
    icon: path.join(root, "build", process.platform === "win32" ? "icon.ico" : "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, sandbox: false },
  });
  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(root, "dist", "index.html"));
  win.webContents.on("before-input-event", (_e, input) => {
    if (input.type === "keyDown" && input.key === "F12") win.webContents.toggleDevTools();
  });
}

// Toda operação de dados passa por aqui. Erros viram mensagem para a interface.
ipcMain.handle("db", (_e, method, ...args) => {
  const fn = api[method];
  if (typeof fn !== "function") throw new Error(`Operação desconhecida: ${method}`);
  return fn(...args);
});

// Backup manual: copia o banco para onde o usuário escolher.
ipcMain.handle("backup:save", async () => {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const res = await dialog.showSaveDialog(win, {
    title: "Salvar backup", defaultPath: `backup-odontoclinic-${stamp}.db`,
    filters: [{ name: "Backup", extensions: ["db"] }],
  });
  if (res.canceled) return null;
  await api.backup(res.filePath);
  return res.filePath;
});

// Restaurar: substitui o banco atual por um backup (o app reinicia).
ipcMain.handle("backup:restore", async () => {
  const res = await dialog.showOpenDialog(win, {
    title: "Restaurar backup", properties: ["openFile"], filters: [{ name: "Backup", extensions: ["db"] }],
  });
  if (res.canceled) return false;
  const confirm = await dialog.showMessageBox(win, {
    type: "warning", buttons: ["Restaurar", "Cancelar"], defaultId: 1, cancelId: 1,
    message: "Restaurar este backup?", detail: "Os dados atuais serão substituídos pelos do arquivo escolhido. O programa vai reiniciar.",
  });
  if (confirm.response !== 0) return false;
  closeDb();
  for (const ext of ["", "-wal", "-shm"]) await fsp.rm(dbFile() + ext, { force: true });
  await fsp.copyFile(res.filePaths[0], dbFile());
  app.relaunch();
  app.exit(0);
  return true;
});

ipcMain.handle("app:info", () => ({ versao: app.getVersion(), dados: dataDir() }));
ipcMain.handle("shell:open-folder", () => shell.openPath(dataDir()));

// Backup automático diário (mantém os 14 mais recentes).
async function autoBackup() {
  try {
    const dir = path.join(dataDir(), "backups-automaticos");
    await fsp.mkdir(dir, { recursive: true });
    const hoje = new Date().toISOString().slice(0, 10);
    const dest = path.join(dir, `clinica-${hoje}.db`);
    if (!fs.existsSync(dest)) await api.backup(dest);
    const arquivos = (await fsp.readdir(dir)).filter((f) => f.endsWith(".db")).sort();
    for (const f of arquivos.slice(0, -14)) await fsp.rm(path.join(dir, f), { force: true });
  } catch {
    // backup automático nunca deve travar o app
  }
}

let dbHandle;
function closeDb() {
  try {
    dbHandle?.close();
  } catch {
    // já fechado
  }
}

app.whenReady().then(() => {
  dbHandle = open(dbFile());
  Menu.setApplicationMenu(null);
  createWindow();
  autoBackup();
});
app.on("window-all-closed", () => {
  closeDb();
  app.quit();
});
