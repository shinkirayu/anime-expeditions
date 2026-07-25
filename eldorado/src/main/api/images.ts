import { apiRequest } from './client'
import type { FileUploadResponse, FlexibleOfferImage } from './types'

/**
 * Base path the site strips from returned image paths. Discovered from the
 * live app config: offerImagePath.absolutePath === "/offerimages/".
 */
const OFFER_IMAGE_BASE_PATH = '/offerimages/'

/**
 * File-type path segment for `POST /api/files/me/{type}`. The site's enum is
 * { Avatar, Document, Offer, WarrantyClaim }; offer images use "Offer".
 * (This is NOT the offer category — that's a separate enum.)
 */
const OFFER_FILE_TYPE = 'Offer'

export interface LocalPhoto {
  /** File name (for the multipart part + error messages). */
  name: string
  /** Raw file bytes. */
  bytes: Uint8Array
  /** MIME type, e.g. "image/png". */
  mimeType: string
}

/**
 * Converts the upload response's `localPaths` ([small, large, original]) into a
 * FlexibleOfferImageDTO, stripping the shared base path exactly like the site.
 */
function toOfferImage(res: FileUploadResponse): FlexibleOfferImage | null {
  if (!res?.localPaths || res.localPaths.length === 0) return null
  const [small, large, original] = res.localPaths.map((p) => p.replace(OFFER_IMAGE_BASE_PATH, ''))
  return {
    smallImage: small ?? null,
    largeImage: large ?? small ?? null,
    originalSizeImage: original ?? large ?? small ?? null
  }
}

/** Uploads a single photo and returns its offer-image object. */
export async function uploadPhoto(photo: LocalPhoto): Promise<FlexibleOfferImage | null> {
  const form = new FormData()
  // Wrap in a Node Buffer so the bytes are a concrete BlobPart regardless of
  // the incoming Uint8Array's backing buffer type.
  const blob = new Blob([Buffer.from(photo.bytes)], {
    type: photo.mimeType || 'application/octet-stream'
  })
  form.append('image', blob, photo.name)

  const res = await apiRequest<FileUploadResponse>(`files/me/${OFFER_FILE_TYPE}`, {
    method: 'POST',
    auth: true,
    form
  })
  return toOfferImage(res)
}

/**
 * Uploads photos sequentially (the API takes one file per request) and returns
 * the resulting offer-image objects in order.
 */
export async function uploadPhotos(photos: LocalPhoto[]): Promise<FlexibleOfferImage[]> {
  const images: FlexibleOfferImage[] = []
  for (const photo of photos) {
    const image = await uploadPhoto(photo)
    if (image) images.push(image)
  }
  return images
}
