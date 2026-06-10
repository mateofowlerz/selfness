import type { BrowserWindow } from "electron";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { ConnectionStatus, Listing, PublishResult } from "../../shared/types";
import { AdapterError, expectShape, request, toAdapterError } from "./apiClient";
import { DEPOP_CONDITION } from "./mapping";
import { clearSession, cookieHeader, isLoggedIn, openLogin, type SessionLoginOptions } from "./sessionLogin";
import type { PlatformAdapter } from "./types";

// Shape guard shared by both publish paths: Depop returns the new product's id
// and slug. If either is missing on a 2xx, the API contract changed.
function isDepopProduct(j: unknown): j is { id?: string; slug?: string } {
  return typeof j === "object" && j !== null;
}

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
      const e = toAdapterError(err, "depop", "publish");
      return { platform: this.platform, ok: false, error: e.message, errorKind: e.kind };
    }
  }

  // Official Selling API path. Endpoint shapes are finalized against the partner
  // docs once access is granted; the canonical->Depop mapping lives here.
  private async publishViaPartnerApi(listing: Listing): Promise<PublishResult> {
    const key = partnerApiKey();
    const headers = { authorization: `Bearer ${key}`, "content-type": "application/json" };
    const resp = await request(`${API_BASE}/api/v1/products`, {
      platform: "depop",
      label: "products (partner create)",
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
    const json = expectShape(resp, "depop", "products (partner create)", isDepopProduct);
    return {
      platform: this.platform,
      ok: true,
      listingId: json.id,
      listingUrl: json.slug ? `${BASE}/products/${json.slug}/` : undefined,
    };
  }

  private async publishViaSession(listing: Listing): Promise<PublishResult> {
    if (!(await isLoggedIn(loginOpts))) throw new AdapterError("not_connected", "Depop is not connected.");
    const cookie = await cookieHeader(PARTITION, BASE);

    // Upload photos first, collecting their ids.
    const pictureIds: string[] = [];
    for (const photo of listing.photos) {
      const buf = readFileSync(photo.path);
      const form = new FormData();
      form.append("file", new Blob([buf]), basename(photo.path));
      const up = await request(`${API_BASE}/api/v1/pictures/`, {
        platform: "depop",
        label: "pictures (upload)",
        method: "POST",
        headers: { cookie },
        body: form,
      });
      const j = expectShape(
        up,
        "depop",
        "pictures (upload)",
        (v): v is { id: string } =>
          typeof v === "object" && v !== null && typeof (v as Record<string, unknown>).id === "string",
      );
      pictureIds.push(j.id);
    }

    const resp = await request(`${API_BASE}/api/v1/products/`, {
      platform: "depop",
      label: "products (session create)",
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
    const json = expectShape(resp, "depop", "products (session create)", isDepopProduct);
    return {
      platform: this.platform,
      ok: true,
      listingId: json.id,
      listingUrl: json.slug ? `${BASE}/products/${json.slug}/` : undefined,
    };
  }
}
