import type { DeliveryMethod } from "./eldoradoTypes";

/** Remembers the last bulk-auto-list price/delivery settings so re-opening it doesn't start blank. */

const STORAGE_KEY = "eldorado.lastBulkRunConfig";

interface LastBulkRunConfig {
  price: string;
  deliveryMethod: DeliveryMethod;
  manualDeliveryTime: string;
}

export function getLastBulkRunConfig(): LastBulkRunConfig | null {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

export function saveLastBulkRunConfig(config: LastBulkRunConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
