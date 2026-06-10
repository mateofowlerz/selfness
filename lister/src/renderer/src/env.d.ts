/// <reference types="vite/client" />
import type { ListerApi } from "../../preload/index";

declare global {
  interface Window {
    lister: ListerApi;
  }
}

export {};
