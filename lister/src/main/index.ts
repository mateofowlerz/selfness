import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { IPC } from "../shared/ipc";
import {
  type ConnectionStatus,
  type Listing,
  type Platform,
  PLATFORMS,
  type PublishResult,
  validateListing,
} from "../shared/types";
import { allAdapters, getAdapter } from "./platforms";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 860,
    minWidth: 880,
    minHeight: 640,
    title: "Lister",
    backgroundColor: "#0b0b0f",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // electron-vite injects the dev server URL in development.
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function requireWindow(): BrowserWindow {
  if (!mainWindow) throw new Error("Main window is not available.");
  return mainWindow;
}

function registerIpc(): void {
  ipcMain.handle(IPC.statusAll, async (): Promise<ConnectionStatus[]> => {
    return Promise.all(allAdapters().map((a) => a.status()));
  });

  ipcMain.handle(IPC.connect, async (_e, platform: Platform): Promise<ConnectionStatus> => {
    return getAdapter(platform).connect(requireWindow());
  });

  ipcMain.handle(IPC.disconnect, async (_e, platform: Platform): Promise<ConnectionStatus> => {
    const adapter = getAdapter(platform);
    await adapter.disconnect();
    return adapter.status();
  });

  ipcMain.handle(
    IPC.publish,
    async (_e, listing: Listing, platforms: Platform[]): Promise<PublishResult[]> => {
      const targets = platforms.filter((p): p is Platform => PLATFORMS.includes(p));
      const errors = validateListing(listing, targets);
      if (errors.length > 0) {
        return targets.map((platform) => ({ platform, ok: false, error: errors.join(" ") }));
      }
      // Publish to each selected platform independently; one failure does not
      // block the others.
      return Promise.all(targets.map((platform) => getAdapter(platform).publish(listing)));
    },
  );

  ipcMain.handle(IPC.pickPhotos, async (): Promise<string[]> => {
    const result = await dialog.showOpenDialog(requireWindow(), {
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "heic"] }],
    });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle(IPC.readPhotoPreview, async (_e, path: string): Promise<string> => {
    const ext = extname(path).toLowerCase().replace(".", "") || "jpeg";
    const mime = ext === "jpg" ? "jpeg" : ext;
    const data = readFileSync(path).toString("base64");
    return `data:image/${mime};base64,${data}`;
  });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
