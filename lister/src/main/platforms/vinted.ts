import type { BrowserWindow } from "electron";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { ConnectionStatus, Listing, PublishResult } from "../../shared/types";
import { AdapterError, expectShape, request, toAdapterError } from "./apiClient";
import { VINTED_PACKAGE_SIZE_ID, VINTED_STATUS_ID } from "./mapping";
import { clearSession, cookieHeader, isLoggedIn, openLogin, type SessionLoginOptions } from "./sessionLogin";
import type { PlatformAdapter } from "./types";

// Vinted has no public listing API for ordinary sellers, so we use the
// session-capture strategy: the user signs in through an embedded window, and we
// reuse that authenticated browser session to upload. Requests carry the user's
// real cookies, fingerprint, and home IP, which is what keeps Vinted's anti-bot
// protection (DataDome-class) from flagging them — and the reason this is an
// Electron app rather than a server.

// Default to the UK marketplace; override via VINTED_BASE_URL for other regions.
const BASE = process.env.VINTED_BASE_URL || "https://www.vinted.co.uk";
const PARTITION = "persist:vinted";

const loginOpts: SessionLoginOptions = {
  partition: PARTITION,
  loginUrl: `${BASE}/member/general/login`,
  cookieDomain: ".vinted.co.uk",
  authCookieName: "access_token_web",
};

export class VintedAdapter implements PlatformAdapter {
  readonly platform = "vinted" as const;

  async status(): Promise<ConnectionStatus> {
    const connected = await isLoggedIn(loginOpts);
    return { platform: this.platform, connected };
  }

  async disconnect(): Promise<void> {
    await clearSession(PARTITION);
  }

  async connect(parent: BrowserWindow): Promise<ConnectionStatus> {
    await openLogin(parent, loginOpts);
    return { platform: this.platform, connected: true };
  }

  // Reads the CSRF token Vinted embeds for authenticated requests.
  private async csrfToken(): Promise<string | undefined> {
    try {
      const cookie = await cookieHeader(PARTITION, BASE);
      const res = await fetch(`${BASE}/api/v2/users/current`, {
        headers: { cookie, accept: "application/json" },
      });
      const csrf = res.headers.get("x-csrf-token");
      return csrf ?? undefined;
    } catch {
      return undefined;
    }
  }

  // Uploads one photo to Vinted's temp-photo endpoint and returns its id, which
  // is then attached to the item payload.
  private async uploadPhoto(cookie: string, csrf: string | undefined, path: string): Promise<string> {
    const buf = readFileSync(path);
    const form = new FormData();
    form.append("photo[type]", "item");
    form.append("photo[file]", new Blob([buf]), basename(path));
    const resp = await request(`${BASE}/api/v2/photos`, {
      platform: "vinted",
      label: "photos (upload)",
      method: "POST",
      headers: { cookie, ...(csrf ? { "x-csrf-token": csrf } : {}) },
      body: form,
    });
    const json = expectShape(
      resp,
      "vinted",
      "photos (upload)",
      (j): j is { id: number | string } =>
        typeof j === "object" &&
        j !== null &&
        ["number", "string"].includes(typeof (j as Record<string, unknown>).id),
    );
    return String(json.id);
  }

  async publish(listing: Listing): Promise<PublishResult> {
    try {
      if (!(await isLoggedIn(loginOpts))) throw new AdapterError("not_connected", "Vinted is not connected.");
      const cookie = await cookieHeader(PARTITION, BASE);
      const csrf = await this.csrfToken();

      const photoIds: string[] = [];
      for (const photo of listing.photos) {
        photoIds.push(await this.uploadPhoto(cookie, csrf, photo.path));
      }

      const body = {
        item: {
          title: listing.title,
          description: listing.description,
          price: listing.price.toFixed(2),
          currency: listing.currency,
          brand: listing.brand,
          size_id: undefined as number | undefined, // resolved from a size lookup in production
          status_id: VINTED_STATUS_ID[listing.condition],
          package_size_id: listing.packageSize ? VINTED_PACKAGE_SIZE_ID[listing.packageSize] : undefined,
          color_ids: [] as number[],
          assigned_photos: photoIds.map((id, i) => ({ id, orientation: 0, position: i })),
          // catalog_id (Vinted's category) is resolved from a catalog lookup in
          // production; left to the account default here.
        },
      };

      const resp = await request(`${BASE}/api/v2/items`, {
        platform: "vinted",
        label: "items (create)",
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
          accept: "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        body: JSON.stringify(body),
      });
      const json = expectShape(
        resp,
        "vinted",
        "items (create)",
        (j): j is { item: { id: number | string; url?: string } } => {
          if (typeof j !== "object" || j === null) return false;
          const item = (j as Record<string, unknown>).item;
          return (
            typeof item === "object" &&
            item !== null &&
            ["number", "string"].includes(typeof (item as Record<string, unknown>).id)
          );
        },
      );
      return {
        platform: this.platform,
        ok: true,
        listingId: String(json.item.id),
        listingUrl: json.item.url,
      };
    } catch (err) {
      const e = toAdapterError(err, "vinted", "publish");
      return { platform: this.platform, ok: false, error: e.message, errorKind: e.kind };
    }
  }
}
