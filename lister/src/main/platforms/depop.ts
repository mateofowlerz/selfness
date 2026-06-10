import type { BrowserWindow } from "electron";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { ConnectionStatus, Listing, PublishResult } from "../../shared/types";
import { DEPOP_CONDITION } from "./mapping";
import { clearSession, cookieHeader, isLoggedIn, openLogin, type SessionLoginOptions } from "./sessionLogin";
import type { PlatformAdapter } from "./types";

// Depop has an official Selling API (OAuth 2.0 + PKCE), but it is partner-only:
// access must be granted by Depop's partner team. So the adapter has two modes:
//
//   - Partner API mode (when DEPOP_API_KEY is set): publish via the official
//     Selling API. Preferred once access is granted.
//   - Session mode (default): the same session-capture path as Vinted, so the
//     tool works for everyone today, before partner approval.

const BASE = process.env.DEPOP_BASE_URL || "https://www.depop.com";
const API_BASE = "https://webapi.depop.com";
const PARTITION = "persist:depop";

const loginOpts: SessionLoginOptions = {
  partition: PARTITION,
  loginUrl: `${BASE}/login/`,
  cookieDomain: ".depop.com",
  authCookieName: "access_token",
};

function partnerApiKey(): string | undefined {
  return process.env.DEPOP_API_KEY;
}

export class DepopAdapter implements PlatformAdapter {
  readonly platform = "depop" as const;

  async status(): Promise<ConnectionStatus> {
    if (partnerApiKey()) {
      return { platform: this.platform, connected: true, detail: "Partner API" };
    }
    const connected = await isLoggedIn(loginOpts);
    return { platform: this.platform, connected };
  }

  async disconnect(): Promise<void> {
    await clearSession(PARTITION);
  }

  async connect(parent: BrowserWindow): Promise<ConnectionStatus> {
    if (partnerApiKey()) {
      // With a partner key, no interactive login is needed.
      return { platform: this.platform, connected: true, detail: "Partner API" };
    }
    await openLogin(parent, loginOpts);
    return { platform: this.platform, connected: true };
  }

  async publish(listing: Listing): Promise<PublishResult> {
    try {
      if (partnerApiKey()) return await this.publishViaPartnerApi(listing);
      return await this.publishViaSession(listing);
    } catch (err) {
      return { platform: this.platform, ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // Official Selling API path. Endpoint shapes are finalized against the partner
  // docs once access is granted; the canonical->Depop mapping lives here.
  private async publishViaPartnerApi(listing: Listing): Promise<PublishResult> {
    const key = partnerApiKey();
    const headers = { authorization: `Bearer ${key}`, "content-type": "application/json" };
    const res = await fetch(`${API_BASE}/api/v1/products`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        description: `${listing.title}\n\n${listing.description}`.trim(),
        price: { amount: listing.price.toFixed(2), currency: listing.currency },
        condition: DEPOP_CONDITION[listing.condition],
        brand: listing.brand,
        size: listing.size,
        colour: listing.color,
        hashtags: listing.tags,
      }),
    });
    if (!res.ok) throw new Error(`Depop partner API create failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { id?: string; slug?: string };
    return {
      platform: this.platform,
      ok: true,
      listingId: json.id,
      listingUrl: json.slug ? `${BASE}/products/${json.slug}/` : undefined,
    };
  }

  private async publishViaSession(listing: Listing): Promise<PublishResult> {
    if (!(await isLoggedIn(loginOpts))) throw new Error("Depop is not connected.");
    const cookie = await cookieHeader(PARTITION, BASE);

    // Upload photos first, collecting their ids.
    const pictureIds: string[] = [];
    for (const photo of listing.photos) {
      const buf = readFileSync(photo.path);
      const form = new FormData();
      form.append("file", new Blob([buf]), basename(photo.path));
      const up = await fetch(`${API_BASE}/api/v1/pictures/`, { method: "POST", headers: { cookie }, body: form });
      if (!up.ok) throw new Error(`Depop picture upload failed: ${up.status} ${await up.text()}`);
      const j = (await up.json()) as { id: string };
      pictureIds.push(j.id);
    }

    const res = await fetch(`${API_BASE}/api/v1/products/`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        description: `${listing.title}\n\n${listing.description}`.trim(),
        price: listing.price.toFixed(2),
        currencyCode: listing.currency,
        condition: DEPOP_CONDITION[listing.condition],
        brand: listing.brand,
        pictureIds,
        hashtags: listing.tags,
      }),
    });
    if (!res.ok) throw new Error(`Depop product create failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { id?: string; slug?: string };
    return {
      platform: this.platform,
      ok: true,
      listingId: json.id,
      listingUrl: json.slug ? `${BASE}/products/${json.slug}/` : undefined,
    };
  }
}
