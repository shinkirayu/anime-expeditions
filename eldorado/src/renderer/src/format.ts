/** Fixed notice appended to every account blob delivered to a buyer. */
export const PURCHASE_WARNING =
  '⚠️  Please record a video from the moment of purchase to assist in case of any disputes regarding account validity. Immediately log in copy pasting the user and the code, no unnecessary activities. Claim without video proof will not be accepted.'

/** Distinctive tail used to detect the notice without duplicating it. */
const WARNING_MARKER = 'Claim without video proof will not be accepted.'

/** Builds the standard account blob from a credential pair. */
export function formatAccountBlob(user: string, pass: string): string {
  return `User: ${user}\nPass: ${pass}\n\n${PURCHASE_WARNING}`
}

/**
 * Guarantees the purchase notice is present on an account blob. Applied to every
 * entry at publish time so manually-typed accounts carry it too.
 */
export function ensureWarning(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  return trimmed.includes(WARNING_MARKER) ? trimmed : `${trimmed}\n\n${PURCHASE_WARNING}`
}
