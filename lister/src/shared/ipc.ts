// IPC channel names shared between main and preload, kept in one place so the
// two sides cannot drift.

export const IPC = {
  statusAll: "platforms:status-all",
  connect: "platforms:connect",
  disconnect: "platforms:disconnect",
  publish: "listing:publish",
  pickPhotos: "photos:pick",
  readPhotoPreview: "photos:preview",
  openDiagnostics: "diagnostics:open",
} as const;
