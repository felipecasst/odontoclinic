// Ponte segura entre a interface e o processo principal (window.odonto).
const { contextBridge, ipcRenderer } = require("electron");

// db(method, ...args) chama uma operação do banco; cada método vira uma função curta.
const db = (method, ...args) => ipcRenderer.invoke("db", method, ...args);

contextBridge.exposeInMainWorld("odonto", {
  db,
  backupSave: () => ipcRenderer.invoke("backup:save"),
  backupRestore: () => ipcRenderer.invoke("backup:restore"),
  appInfo: () => ipcRenderer.invoke("app:info"),
  openDataFolder: () => ipcRenderer.invoke("shell:open-folder"),
});
