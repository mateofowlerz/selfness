import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../shared/ipc";
import type { ConnectionStatus, Listing, Platform, PublishResult } from "../shared/types";

// The single, typed bridge exposed to the renderer. No Node APIs leak through;
// contextIsolation stays on and the renderer can only call these functions.
const api = {
  statusAll: (): Promise<ConnectionStatus[]> => ipcRenderer.invoke(IPC.statusAll),
  connect: (platform: Platform): Promise<ConnectionStatus> => ipcRenderer.invoke(IPC.connect, platform),
  disconnect: (platform: Platform): Promise<ConnectionStatus> => ipcRenderer.invoke(IPC.disconnect, platform),
  publish: (listing: Listing, platforms: Platform[]): Promise<PublishResult[]> =>
    ipcRenderer.invoke(IPC.publish, listing, platforms),
  pickPhotos: (): Promise<string[]> => ipcRenderer.invoke(IPC.pickPhotos),
  readPhotoPreview: (path: string): Promise<string> => ipcRenderer.invoke(IPC.readPhotoPreview, path),
  openDiagnostics: (): Promise<void> => ipcRenderer.invoke(IPC.openDiagnostics),
};

contextBridge.exposeInMainWorld("lister", api);

export type ListerApi = typeof api;
