import type { BrowserWindow } from "electron";
import type { ConnectionStatus, Listing, Platform, PublishResult } from "../../shared/types";

// Every marketplace integration implements this interface. Two connection
// strategies exist behind it:
//
//   - OAuth (eBay always; Depop when partner credentials are configured):
//     a standards-based consent flow. We never see the user's password.
//
//   - Session capture (Vinted always; Depop as a fallback): the user signs in
//     through an embedded BrowserView using a dedicated session partition.
//     They handle 2FA/captcha as a human; we reuse the resulting authenticated
//     session to publish. This is the core reason the app is Electron: requests
//     originate from the user's real browser session, IP, and fingerprint.

export interface PlatformAdapter {
  readonly platform: Platform;

  // Begin the connect flow. Implementations may open an auth window parented to
  // `parent`. Resolves once the connection is established (or rejects/aborts).
  connect(parent: BrowserWindow): Promise<ConnectionStatus>;

  // Report current connection status without prompting the user.
  status(): Promise<ConnectionStatus>;

  // Drop stored tokens/sessions for this platform.
  disconnect(): Promise<void>;

  // Publish a canonical listing. Implementations map the canonical shape onto
  // the platform's own taxonomy and API.
  publish(listing: Listing): Promise<PublishResult>;
}
