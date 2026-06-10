import type { Platform } from "../../shared/types";
import { DepopAdapter } from "./depop";
import { EbayAdapter } from "./ebay";
import type { PlatformAdapter } from "./types";
import { VintedAdapter } from "./vinted";

const adapters: Record<Platform, PlatformAdapter> = {
  ebay: new EbayAdapter(),
  depop: new DepopAdapter(),
  vinted: new VintedAdapter(),
};

export function getAdapter(platform: Platform): PlatformAdapter {
  return adapters[platform];
}

export function allAdapters(): PlatformAdapter[] {
  return Object.values(adapters);
}
