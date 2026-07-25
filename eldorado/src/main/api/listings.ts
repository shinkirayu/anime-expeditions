import { app } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { apiRequest } from './client'
import { uploadPhotos, type LocalPhoto } from './images'
import type {
  AccountOfferCreateRequest,
  FlexibleOfferImage,
  GuaranteedDeliveryTime
} from './types'

export type DeliveryMethod = 'Automatic' | 'Manual'

/**
 * Everything the New Listing form collects, mirroring the live sell form:
 *  - Automatic delivery → `guaranteedDeliveryTime: "Instant"`, the account
 *    blobs are sent as `accountSecretDetails`, and quantity = number of blobs.
 *  - Manual delivery → seller picks `manualDeliveryTime`, no secret details are
 *    sent, and quantity is seller-specified.
 */
export interface PublishInput {
  gameId: string
  offerTitle: string
  description: string
  price: number
  hasOriginalEmail: boolean
  photos: LocalPhoto[]
  deliveryMethod: DeliveryMethod
  /** Automatic: one free-text blob per account (buyer receives one per purchase). */
  accounts: string[]
  /** Manual: the guaranteed delivery time the seller commits to. */
  manualDeliveryTime: GuaranteedDeliveryTime
  /** Manual: how many identical accounts are in stock. */
  quantity: number
}

export interface PublishResult {
  offerId: string
  uploadedImages: number
}

function buildRequest(input: PublishInput, images: FlexibleOfferImage[]): AccountOfferCreateRequest {
  const isAuto = input.deliveryMethod === 'Automatic'
  const accounts = input.accounts.map((a) => a.trim()).filter((a) => a.length > 0)

  return {
    details: {
      offerTitle: input.offerTitle,
      // The main image is separate; offerImages holds only the *additional*
      // photos (the site sends offerImages: [] when there's just one image).
      mainOfferImage: images[0] ?? null,
      offerImages: images.slice(1),
      description: input.description,
      guaranteedDeliveryTime: isAuto ? 'Instant' : input.manualDeliveryTime,
      pricing: {
        // Auto: one unit of stock per account blob. Manual: seller's quantity.
        quantity: isAuto ? Math.max(accounts.length, 1) : Math.max(input.quantity, 1),
        minQuantity: 1,
        volumeDiscounts: [],
        pricePerUnit: { amount: input.price, currency: 'USD' }
      },
      hasOriginalEmail: input.hasOriginalEmail
    },
    augmentedGame: {
      gameId: input.gameId,
      category: 'Account',
      tradeEnvironmentId: null,
      attributeIdsCsv: null,
      offerAttributes: []
    },
    // Sent only for automatic delivery; empty for manual.
    accountSecretDetails: isAuto ? accounts : []
  }
}

/** Writes the last publish attempt (request + result/error) to userData for debugging. */
function writeDebugLog(payload: unknown): void {
  try {
    writeFileSync(join(app.getPath('userData'), 'last-publish.json'), JSON.stringify(payload, null, 2))
  } catch {
    /* logging is best-effort */
  }
}

/**
 * Full publish flow: upload photos → build the request with returned image
 * objects → create the account offer. Returns the new offer id.
 */
export async function publishListing(input: PublishInput): Promise<PublishResult> {
  // Phase 1: upload photos (each hits POST files/me/Account).
  let images
  try {
    images = await uploadPhotos(input.photos)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    writeDebugLog({ phase: 'photo-upload', photoCount: input.photos.length, error: message })
    throw new Error(`Photo upload failed: ${message}`)
  }

  // Phase 2: create the offer.
  const request = buildRequest(input, images)
  try {
    const created = await apiRequest<{ id?: string; offerId?: string }>('flexibleOffers/account', {
      method: 'POST',
      auth: true,
      json: request
    })
    writeDebugLog({ phase: 'create', request, response: created })
    return {
      offerId: created?.id ?? created?.offerId ?? '(created)',
      uploadedImages: images.length
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    writeDebugLog({ phase: 'create', request, error: message })
    throw new Error(`Create listing failed: ${message}`)
  }
}

/**
 * Lightweight authenticated call used by "Test Connection" — proves the token,
 * cookie, and User-Agent all work together.
 */
export async function testConnection(): Promise<string> {
  await apiRequest<unknown>('v1/orders/me/seller-api-eligibility', { auth: true })
  return 'Connected. Authentication and seller API access are working.'
}
