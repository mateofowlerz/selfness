import { BrowserWindow, type Session, session as electronSession } from "electron";

// Shared helper for the session-capture strategy. We open a real browser window
// on a dedicated session partition and let the user sign in normally — including
// any 2FA or captcha, which they clear as a human. Once we detect a logged-in
// state (a cookie the platform only sets after auth), we keep the persistent
// partition; subsequent API requests reuse those cookies, so they originate from
// the user's own authenticated session.

export interface SessionLoginOptions {
  // Persistent partition name, e.g. "persist:vinted".
  partition: string;
  // URL to load for login.
  loginUrl: string;
  // Host to match cookies against, e.g. ".vinted.co.uk".
  cookieDomain: string;
  // Name of the cookie that only exists once authenticated.
  authCookieName: string;
  // Optional: derive a display account name once logged in.
  resolveAccount?: (session: Session) => Promise<string | undefined>;
}

export function partitionSession(partition: string): Session {
  return electronSession.fromPartition(partition);
}

// Returns true if the auth cookie is currently present on the partition.
export async function isLoggedIn(opts: SessionLoginOptions): Promise<boolean> {
  const ses = partitionSession(opts.partition);
  const cookies = await ses.cookies.get({ name: opts.authCookieName });
  return cookies.length > 0;
}

// Opens the login window and resolves when the auth cookie appears.
export function openLogin(parent: BrowserWindow, opts: SessionLoginOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const ses = partitionSession(opts.partition);
    const win = new BrowserWindow({
      parent,
      width: 980,
      height: 820,
      title: "Sign in",
      webPreferences: { session: ses, nodeIntegration: false, contextIsolation: true },
    });

    let settled = false;
    let poll: NodeJS.Timeout | undefined;

    const cleanup = () => {
      if (poll) clearInterval(poll);
    };
    const succeed = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (!win.isDestroyed()) win.close();
      resolve();
    };

    // Poll for the auth cookie; navigation events alone are unreliable across
    // the platforms' SPA login flows.
    poll = setInterval(async () => {
      try {
        const cookies = await ses.cookies.get({ name: opts.authCookieName });
        if (cookies.length > 0) succeed();
      } catch {
        // ignore transient cookie read errors
      }
    }, 1000);

    win.on("closed", () => {
      cleanup();
      if (!settled) {
        settled = true;
        reject(new Error("Sign-in window was closed before completing."));
      }
    });

    void win.loadURL(opts.loginUrl);
  });
}

// Best-effort cookie header for a domain, for use in fetch requests made from
// the main process against the platform's API.
export async function cookieHeader(partition: string, url: string): Promise<string> {
  const ses = partitionSession(partition);
  const cookies = await ses.cookies.get({ url });
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

export async function clearSession(partition: string): Promise<void> {
  const ses = partitionSession(partition);
  await ses.clearStorageData();
}
