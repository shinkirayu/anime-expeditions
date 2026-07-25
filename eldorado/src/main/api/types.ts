/**
 * Type definitions mirroring the Eldorado Seller API DTOs used by this app.
 * Source: swagger `/swagger/seller/swagger.json` + the endpoints discovered
 * from the live site (games catalog, image upload).
 */

/** Currency is USD across Eldorado's public constants. */
export type Currency = 'USD'

/** Eldorado.SharedKernel.Domain.Enums.GuaranteedDeliveryTime */
export const GUARANTEED_DELIVERY_TIMES = [
  'Instant',
  'Minute5',
  'Minute20',
  'Hour1',
  'Hour2',
  'Hour3',
  'Hour5',
  'Hour8',
  'Hour12',
  'Day1',
  'Day2',
  'Day3',
  'Day7',
  'Day14',
  'Day28',
  'Day45',
  'Day60',
  'Automated',
  'NotApplicable'
] as const
export type GuaranteedDeliveryTime = (typeof GUARANTEED_DELIVERY_TIMES)[number]

/** Eldorado.SharedKernel.Domain.Enums.Category (account offers use "Account"). */
export type Category = 'Account'

/** Eldorado.SharedKernel.Domain.Models.DTO.MoneyBaseDTO */
export interface MoneyBase {
  amount: number
  currency: Currency
}

/** Eldorado.SharedKernel.Domain.Models.DTO.Offer.FlexibleOfferImageDTO */
export interface FlexibleOfferImage {
  smallImage: string | null
  largeImage: string | null
  originalSizeImage: string | null
}

/** Eldorado.SharedOfferKernel.Domain.Models.DTO.VolumeDiscountPublicDTO */
export interface VolumeDiscount {
  quantity: number
  percentage: number
}

/** Eldorado.SharedOfferKernel.Domain.Models.DTO.OfferPricingPrivateDTO */
export interface OfferPricing {
  quantity: number
  minQuantity: number
  volumeDiscounts: VolumeDiscount[]
  pricePerUnit: MoneyBase
}

/** Eldorado.FlexibleOfferManagement.Domain.Models.DTO.FlexibleOfferDetailsPrivateDTO */
export interface FlexibleOfferDetails {
  offerTitle: string | null
  mainOfferImage: FlexibleOfferImage | null
  offerImages: FlexibleOfferImage[] | null
  description: string | null
  guaranteedDeliveryTime: GuaranteedDeliveryTime
  pricing: OfferPricing
  hasOriginalEmail: boolean | null
}

/** Eldorado.SharedOfferKernel.Domain.Models.DTO.OfferAugmentedGamePrivateDTO */
export interface OfferAugmentedGame {
  gameId: string
  category: Category
  tradeEnvironmentId: string | null
  attributeIdsCsv: string | null
  offerAttributes: unknown[] | null
}

/**
 * Eldorado.FlexibleOfferManagement.Domain.Models.Requests.AccountOfferCreatePrivateDTO
 *
 * Matches how the live sell form builds the payload: the account info is a
 * free-text string array (`accountSecretDetails`, one entry per account), sent
 * only for automatic delivery. The structured `accountDeliveryDetails` object is
 * not used by the site.
 */
export interface AccountOfferCreateRequest {
  details: FlexibleOfferDetails
  augmentedGame: OfferAugmentedGame
  /** One free-text blob per account. Populated for automatic delivery only. */
  accountSecretDetails: string[]
}

/** A single row of the `GET /api/library` catalog response. */
export interface LibraryEntry {
  gameId: string
  gameName: string
  menuGameTitle: string
  category: string
  title: string
  seoAlias: string
  legacyUrlId: string | null
  isPopularGame: boolean
}

/** Simplified game option surfaced to the UI. */
export interface GameOption {
  gameId: string
  name: string
  seoAlias: string
  isPopular: boolean
}

/** Delivery method for account offers. */
export type DeliveryMethod = 'Automatic' | 'Manual'

/** One credential pair from the bulk account pool. */
export interface BulkAccount {
  id: string
  user: string
  pass: string
  /** Set once the account has been pulled into a listing, to avoid double-selling. */
  used: boolean
}

/** A saved New-Listing preset (shared fields only — not per-listing photos/accounts). */
export interface ListingTemplate {
  name: string
  gameId: string
  offerTitle: string
  description: string
  price: number | null
  hasOriginalEmail: boolean
  deliveryMethod: DeliveryMethod
  manualDeliveryTime: string
  quantity: number
}

/** Response of `POST /api/files/me/{category}`. */
export interface FileUploadResponse {
  localPaths: string[]
}

/** How the app obtains an IdToken. */
export type AuthMode = 'token' | 'password'

/** Persisted user settings surfaced to the renderer (no secrets). */
export interface Settings {
  baseUrl: string
  userAgent: string
  authMode: AuthMode
  /** Account email (password mode, and shown as status). */
  email: string
  /** True when the active mode has usable credentials. */
  signedIn: boolean
  /** Token-mode only: epoch seconds the pasted token expires, or null. */
  tokenExpiresAt: number | null
}

export interface ApiResult<T> {
  ok: boolean
  data?: T
  error?: string
}
