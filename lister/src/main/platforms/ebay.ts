import { BrowserWindow } from "electron";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { ConnectionStatus, Listing, PublishResult } from "../../shared/types";
import { getItem, removeItem, setItem } from "../storage/secureStore";
import { AdapterError, expectShape, request, toAdapterError } from "./apiClient";
import { EBAY_CONDITION, resolveCategoryId } from "./mapping";
import type { PlatformAdapter } from "./types";

// eBay integration over the official developer program. This is the cleanest of
// the three: a standard OAuth Authorization Code flow, then the Inventory API
// sequence createInventoryItem -> createOffer -> publishOffer.

interface EbayConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string; // eBay "RuName" or registered redirect URI.
  sandbox: boolean;
}

interface EbayTokens {
  accessToken: string;
  refreshToken: string;
  // Epoch ms when the access token expires.
  expiresAt: number;
  account?: string;
}

const TOKENS_KEY = "ebay:tokens";

const SCOPES = ["https://api.ebay.com/oauth/api_scope", "https://api.ebay.com/oauth/api_scope/sell.inventory"];

function config(): EbayConfig | undefined {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const redirectUri = process.env.EBAY_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return undefined;
  return { clientId, clientSecret, redirectUri, sandbox: process.env.EBAY_SANDBOX === "true" };
}

function host(cfg: EbayConfig, kind: "auth" | "api"): string {
  const sub = kind === "auth" ? "auth" : "api";
  return cfg.sandbox ? `https://${sub}.sandbox.ebay.com` : `https://${sub}.ebay.com`;
}

function basicAuthHeader(cfg: EbayConfig): string {
  return "Basic " + Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
}

export class EbayAdapter implements PlatformAdapter {
  readonly platform = "ebay" as const;

  async status(): Promise<ConnectionStatus> {
    const tokens = getItem<EbayTokens>(TOKENS_KEY);
    if (!tokens) return { platform: this.platform, connected: false };
    return { platform: this.platform, connected: true, account: tokens.account };
  }

  async disconnect(): Promise<void> {
    removeItem(TOKENS_KEY);
  }

  async connect(parent: BrowserWindow): Promise<ConnectionStatus> {
    const cfg = config();
    if (!cfg) {
      throw new Error(
        "eBay is not configured. Set EBAY_CLIENT_ID, EBAY_CLIENT_SECRET and EBAY_REDIRECT_URI to enable OAuth.",
      );
    }

    const state = randomUUID();
    const authUrl = new URL(`${host(cfg, "auth")}/oauth2/authorize`);
    authUrl.searchParams.set("client_id", cfg.clientId);
    authUrl.searchParams.set("redirect_uri", cfg.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", SCOPES.join(" "));
    authUrl.searchParams.set("state", state);

    const code = await this.runOAuthWindow(parent, authUrl.toString(), cfg.redirectUri, state);
    const tokens = await this.exchangeCode(cfg, code);
    setItem(TOKENS_KEY, tokens);
    return { platform: this.platform, connected: true, account: tokens.account };
  }

  // Opens an auth window, waits for eBay to redirect to our redirect URI, and
  // extracts the authorization code from the callback URL.
  private runOAuthWindow(
    parent: BrowserWindow,
    authUrl: string,
    redirectUri: string,
    expectedState: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const win = new BrowserWindow({
        parent,
        modal: true,
        width: 520,
        height: 720,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
        if (!win.isDestroyed()) win.close();
      };

      const handle = (urlStr: string) => {
        if (!urlStr.startsWith(redirectUri)) return;
        const url = new URL(urlStr);
        const error = url.searchParams.get("error");
        if (error) return finish(() => reject(new Error(`eBay OAuth error: ${error}`)));
        if (url.searchParams.get("state") !== expectedState) {
          return finish(() => reject(new Error("eBay OAuth state mismatch")));
        }
        const code = url.searchParams.get("code");
        if (code) finish(() => resolve(code));
      };

      win.webContents.on("will-redirect", (_e, u) => handle(u));
      win.webContents.on("will-navigate", (_e, u) => handle(u));
      win.on("closed", () => {
        if (!settled) {
          settled = true;
          reject(new Error("eBay connection window was closed before completing."));
        }
      });

      void win.loadURL(authUrl);
    });
  }

  private async exchangeCode(cfg: EbayConfig, code: string): Promise<EbayTokens> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: cfg.redirectUri,
    });
    const resp = await request(`${host(cfg, "api")}/identity/v1/oauth2/token`, {
      platform: "ebay",
      label: "oauth/token (exchange)",
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", authorization: basicAuthHeader(cfg) },
      body,
    });
    const json = expectShape(
      resp,
      "ebay",
      "oauth/token (exchange)",
      (j): j is { access_token: string; refresh_token: string; expires_in: number } =>
        typeof j === "object" &&
        j !== null &&
        typeof (j as Record<string, unknown>).access_token === "string" &&
        typeof (j as Record<string, unknown>).refresh_token === "string" &&
        typeof (j as Record<string, unknown>).expires_in === "number",
    );
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
  }

  private async validToken(cfg: EbayConfig): Promise<string> {
    const tokens = getItem<EbayTokens>(TOKENS_KEY);
    if (!tokens) throw new AdapterError("not_connected", "eBay is not connected.");
    if (Date.now() < tokens.expiresAt - 60_000) return tokens.accessToken;

    // Refresh using the long-lived refresh token.
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      scope: SCOPES.join(" "),
    });
    const resp = await request(`${host(cfg, "api")}/identity/v1/oauth2/token`, {
      platform: "ebay",
      label: "oauth/token (refresh)",
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", authorization: basicAuthHeader(cfg) },
      body,
    });
    const json = expectShape(
      resp,
      "ebay",
      "oauth/token (refresh)",
      (j): j is { access_token: string; expires_in: number } =>
        typeof j === "object" &&
        j !== null &&
        typeof (j as Record<string, unknown>).access_token === "string" &&
        typeof (j as Record<string, unknown>).expires_in === "number",
    );
    const updated: EbayTokens = {
      ...tokens,
      accessToken: json.access_token,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
    setItem(TOKENS_KEY, updated);
    return updated.accessToken;
  }

  async publish(listing: Listing): Promise<PublishResult> {
    const cfg = config();
    if (!cfg) {
      return { platform: this.platform, ok: false, error: "eBay is not configured.", errorKind: "not_connected" };
    }
    try {
      const token = await this.validToken(cfg);
      const api = host(cfg, "api");
      const headers = {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "content-language": "en-GB",
      };
      const sku = `lister-${randomUUID().slice(0, 12)}`;

      // 1. Create or replace the inventory item (eBay returns 204 No Content).
      await request(`${api}/sell/inventory/v1/inventory_item/${sku}`, {
        platform: "ebay",
        label: "createInventoryItem",
        method: "PUT",
        headers,
        okStatuses: [200, 204],
        body: JSON.stringify({
          availability: { shipToLocationAvailability: { quantity: 1 } },
          condition: EBAY_CONDITION[listing.condition],
          product: {
            title: listing.title,
            description: listing.description || listing.title,
            brand: listing.brand,
            aspects: buildAspects(listing),
            imageUrls: [], // eBay requires hosted image URLs; see seam below.
          },
        }),
      });

      // NOTE: eBay requires image URLs, not raw uploads. Production hosts the
      // photos (e.g. via eBay's media API or our own bucket) and passes the
      // URLs above. Local file paths are read here so the seam is obvious.
      void listing.photos.map((p) => basename(p.path));

      // 2. Stage an offer.
      const offerResp = await request(`${api}/sell/inventory/v1/offer`, {
        platform: "ebay",
        label: "createOffer",
        method: "POST",
        headers,
        body: JSON.stringify({
          sku,
          marketplaceId: process.env.EBAY_MARKETPLACE_ID || "EBAY_GB",
          format: "FIXED_PRICE",
          availableQuantity: 1,
          categoryId: resolveCategoryId("ebay", listing.category) ?? process.env.EBAY_DEFAULT_CATEGORY_ID,
          listingDescription: listing.description || listing.title,
          pricingSummary: { price: { value: listing.price.toFixed(2), currency: listing.currency } },
          listingPolicies: {
            fulfillmentPolicyId: process.env.EBAY_FULFILLMENT_POLICY_ID,
            paymentPolicyId: process.env.EBAY_PAYMENT_POLICY_ID,
            returnPolicyId: process.env.EBAY_RETURN_POLICY_ID,
          },
        }),
      });
      const { offerId } = expectShape(
        offerResp,
        "ebay",
        "createOffer",
        (j): j is { offerId: string } =>
          typeof j === "object" && j !== null && typeof (j as Record<string, unknown>).offerId === "string",
      );

      // 3. Publish the offer into a live listing.
      const pubResp = await request(`${api}/sell/inventory/v1/offer/${offerId}/publish`, {
        platform: "ebay",
        label: "publishOffer",
        method: "POST",
        headers,
      });
      const { listingId } = expectShape(
        pubResp,
        "ebay",
        "publishOffer",
        (j): j is { listingId: string } =>
          typeof j === "object" && j !== null && typeof (j as Record<string, unknown>).listingId === "string",
      );

      return {
        platform: this.platform,
        ok: true,
        listingId,
        listingUrl: `https://www.ebay.com/itm/${listingId}`,
      };
    } catch (err) {
      const e = toAdapterError(err, "ebay", "publish");
      return { platform: this.platform, ok: false, error: e.message, errorKind: e.kind };
    }
  }
}

function buildAspects(listing: Listing): Record<string, string[]> {
  const aspects: Record<string, string[]> = {};
  if (listing.brand) aspects.Brand = [listing.brand];
  if (listing.size) aspects.Size = [listing.size];
  if (listing.color) aspects.Colour = [listing.color];
  return aspects;
}

// Reads a photo from disk as base64; used by image-hosting integrations.
export function readPhotoBase64(path: string): string {
  return readFileSync(path).toString("base64");
}
