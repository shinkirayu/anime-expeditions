/** A photo already read into transferable bytes (ready for the publish IPC). */
export interface EncodedPhoto {
  name: string
  mimeType: string
  bytes: Uint8Array
}

/** Everything needed to publish one listing (self-contained — safe to queue). */
export interface ListingDraft {
  gameId: string
  /** Display-only game name (ignored by the API). */
  gameName: string
  offerTitle: string
  description: string
  price: number
  hasOriginalEmail: boolean
  deliveryMethod: 'Automatic' | 'Manual'
  accounts: string[]
  manualDeliveryTime: string
  quantity: number
  photos: EncodedPhoto[]
}

export type QueueStatus = 'pending' | 'publishing' | 'done' | 'error'

export interface QueueItem extends ListingDraft {
  id: string
  status: QueueStatus
  error?: string
  offerId?: string
}
