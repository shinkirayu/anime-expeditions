/** Types mirroring the Eldorado Auto Lister desktop app 1:1 (eldorado/src/main/api/types.ts + renderer/src/types.ts). */

export type Currency = "USD";

export const GUARANTEED_DELIVERY_TIMES = [
  "Instant",
  "Minute5",
  "Minute20",
  "Hour1",
  "Hour2",
  "Hour3",
  "Hour5",
  "Hour8",
  "Hour12",
  "Day1",
  "Day2",
  "Day3",
  "Day7",
  "Day14",
  "Day28",
  "Day45",
  "Day60",
  "Automated",
  "NotApplicable",
] as const;
export type GuaranteedDeliveryTime = (typeof GUARANTEED_DELIVERY_TIMES)[number];

export type Category = "Account";

export interface MoneyBase {
  amount: number;
  currency: Currency;
}

export interface FlexibleOfferImage {
  smallImage: string | null;
  largeImage: string | null;
  originalSizeImage: string | null;
}

export interface VolumeDiscount {
  quantity: number;
  percentage: number;
}

export interface OfferPricing {
  quantity: number;
  minQuantity: number;
  volumeDiscounts: VolumeDiscount[];
  pricePerUnit: MoneyBase;
}

export interface FlexibleOfferDetails {
  offerTitle: string | null;
  mainOfferImage: FlexibleOfferImage | null;
  offerImages: FlexibleOfferImage[] | null;
  description: string | null;
  guaranteedDeliveryTime: GuaranteedDeliveryTime;
  pricing: OfferPricing;
  hasOriginalEmail: boolean | null;
}

export interface OfferAugmentedGame {
  gameId: string;
  category: Category;
  tradeEnvironmentId: string | null;
  attributeIdsCsv: string | null;
  offerAttributes: unknown[] | null;
}

export interface AccountOfferCreateRequest {
  details: FlexibleOfferDetails;
  augmentedGame: OfferAugmentedGame;
  accountSecretDetails: string[];
}

export interface LibraryEntry {
  gameId: string;
  gameName: string;
  menuGameTitle: string;
  category: string;
  title: string;
  seoAlias: string;
  legacyUrlId: string | null;
  isPopularGame: boolean;
}

export interface GameOption {
  gameId: string;
  name: string;
  seoAlias: string;
  isPopular: boolean;
}

export type DeliveryMethod = "Automatic" | "Manual";

export interface BulkAccount {
  id: string;
  user: string;
  pass: string;
  used: boolean;
}

export interface ListingTemplate {
  name: string;
  gameId: string;
  offerTitle: string;
  description: string;
  price: number | null;
  hasOriginalEmail: boolean;
  deliveryMethod: DeliveryMethod;
  manualDeliveryTime: string;
  quantity: number;
}

export interface FileUploadResponse {
  localPaths: string[];
}

export type AuthMode = "token" | "password";

export interface EldoradoAuthState {
  authMode: AuthMode;
  email: string;
  signedIn: boolean;
  tokenExpiresAt: number | null;
}

/** A photo already read into transferable bytes (mirrors EncodedPhoto). */
export interface EncodedPhoto {
  name: string;
  mimeType: string;
  bytes: Uint8Array;
}

/** Everything needed to publish one listing (self-contained — safe to queue). */
export interface ListingDraft {
  gameId: string;
  /** Display-only game name (ignored by the API). */
  gameName: string;
  offerTitle: string;
  description: string;
  price: number;
  hasOriginalEmail: boolean;
  deliveryMethod: DeliveryMethod;
  accounts: string[];
  manualDeliveryTime: string;
  quantity: number;
  photos: EncodedPhoto[];
}

export type QueueStatus = "pending" | "publishing" | "done" | "error";

export interface QueueItem extends ListingDraft {
  id: string;
  status: QueueStatus;
  error?: string;
  offerId?: string;
}

export interface PublishResult {
  offerId: string;
  uploadedImages: number;
}
