import { useCallback, useState } from "react";
import type { ListingPhoto } from "../../../shared/types";

interface Props {
  photos: ListingPhoto[];
  onChange: (photos: ListingPhoto[]) => void;
}

// Drag-and-drop and click-to-pick photo input. Dropped files expose an absolute
// path via Electron's File.path; the preview data URL is read back through the
// main process so we never inline large blobs in the renderer state.
export function PhotoDropzone({ photos, onChange }: Props): React.ReactElement {
  const [dragOver, setDragOver] = useState(false);

  const addPaths = useCallback(
    async (paths: string[]) => {
      const existing = new Set(photos.map((p) => p.path));
      const fresh = paths.filter((p) => !existing.has(p));
      const withPreviews = await Promise.all(
        fresh.map(async (path) => ({
          path,
          name: path.split(/[\\/]/).pop() ?? path,
          previewDataUrl: await window.lister.readPhotoPreview(path),
        })),
      );
      onChange([...photos, ...withPreviews]);
    },
    [photos, onChange],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const paths: string[] = [];
      for (const file of Array.from(e.dataTransfer.files)) {
        // Electron augments File with an absolute path.
        const path = (file as File & { path?: string }).path;
        if (path) paths.push(path);
      }
      if (paths.length > 0) void addPaths(paths);
    },
    [addPaths],
  );

  const pick = useCallback(async () => {
    const paths = await window.lister.pickPhotos();
    if (paths.length > 0) void addPaths(paths);
  }, [addPaths]);

  const remove = useCallback(
    (path: string) => onChange(photos.filter((p) => p.path !== path)),
    [photos, onChange],
  );

  const move = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= photos.length) return;
      const next = [...photos];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      onChange(next);
    },
    [photos, onChange],
  );

  return (
    <div>
      <button
        type="button"
        className={`dropzone${dragOver ? " dropzone--over" : ""}`}
        onClick={pick}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <span className="dropzone__icon">⤓</span>
        <span>Drag photos here, or click to choose</span>
        <span className="dropzone__hint">JPG, PNG, WebP, HEIC</span>
      </button>

      {photos.length > 0 && (
        <ul className="thumbs">
          {photos.map((photo, i) => (
            <li key={photo.path} className="thumb">
              {photo.previewDataUrl ? (
                // Plain <img> is fine here: this is the Electron renderer, not
                // the Next.js site workspace.
                <img src={photo.previewDataUrl} alt={photo.name} className="thumb__img" />
              ) : (
                <div className="thumb__img thumb__img--empty" />
              )}
              {i === 0 && <span className="thumb__badge">Cover</span>}
              <div className="thumb__actions">
                <button type="button" onClick={() => move(i, i - 1)} aria-label="Move left">
                  ‹
                </button>
                <button type="button" onClick={() => remove(photo.path)} aria-label="Remove">
                  ✕
                </button>
                <button type="button" onClick={() => move(i, i + 1)} aria-label="Move right">
                  ›
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
