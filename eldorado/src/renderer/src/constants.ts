/** Runtime constants mirrored for the UI (values, not just types). */

/**
 * Delivery-time options shown for MANUAL delivery (seller delivers by hand).
 * Automatic delivery doesn't use this list — it's always sent as "Instant".
 */
export const MANUAL_DELIVERY_TIMES: { value: string; label: string }[] = [
  { value: 'Minute20', label: '20 minutes' },
  { value: 'Hour1', label: '1 hour' },
  { value: 'Hour2', label: '2 hours' },
  { value: 'Hour3', label: '3 hours' },
  { value: 'Hour5', label: '5 hours' },
  { value: 'Hour8', label: '8 hours' },
  { value: 'Hour12', label: '12 hours' },
  { value: 'Day1', label: '1 day' },
  { value: 'Day2', label: '2 days' },
  { value: 'Day3', label: '3 days' },
  { value: 'Day7', label: '7 days' },
  { value: 'Day14', label: '14 days' }
]

/** From /api/appConstants → offerConstants. */
export const PRICE_LIMITS = {
  minUnitPrice: 0.00001,
  maxUnitPrice: 10000,
  minOfferValue: 0.5
}

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
