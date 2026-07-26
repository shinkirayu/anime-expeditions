/** Types mirroring the ZeusX Auto-Lister desktop app (ZeusX/ZeusxLister/zeusx_lister_gui.py). */

export interface ZeusXCategory {
  label: string;
  categoryId: string;
  baseId: string;
}

/** Known categories -> (service_category_id, service_category_base_id), from the Python tool. */
export const ZEUSX_CATEGORIES: ZeusXCategory[] = [
  { label: "In-game items", categoryId: "2", baseId: "35" },
  { label: "Game services", categoryId: "47", baseId: "327" },
];

export interface ZeusXAttribute {
  baseAttributeId: string;
  baseAttributeValue: string;
}

export interface ZeusXListingInput {
  title: string;
  description: string;
  price: string;
  categoryId: string;
  categoryBaseId: string;
  /** Free-text field on the real site too — "COORDINATED" is the only value the desktop tool defaults to. */
  deliveryMethod: string;
  attributes: ZeusXAttribute[];
  /** Duration categories only. */
  days: string;
  hours: string;
  /** > 1 sets has_multiple_stock. */
  quantity: string;
  photo?: { name: string; mimeType: string; bytes: Uint8Array } | null;
}

export interface ZeusXPublishResult {
  offerId: string | null;
}
