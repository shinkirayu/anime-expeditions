/**
 * Renderer-side typing of the `window.eldorado` bridge exposed by the preload
 * script. Kept self-contained so the renderer never imports main-process code.
 */

type AuthMode = 'token' | 'password'

interface ApiResult<T> {
  ok: boolean
  data?: T
  error?: string
}

interface SettingsView {
  baseUrl: string
  userAgent: string
  authMode: AuthMode
  email: string
  signedIn: boolean
  tokenExpiresAt: number | null
}

interface ConnectionUpdatePayload {
  baseUrl: string
  userAgent: string
}

interface GameOptionView {
  gameId: string
  name: string
  seoAlias: string
  isPopular: boolean
}

type DeliveryMethod = 'Automatic' | 'Manual'

interface ListingTemplateView {
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

interface BulkAccountView {
  id: string
  user: string
  pass: string
  used: boolean
}

interface BulkImportResult {
  accounts: BulkAccountView[]
  added: number
  skipped: number
}

interface PublishResultView {
  offerId: string
  uploadedImages: number
}

interface EldoradoBridge {
  getSettings: () => Promise<ApiResult<SettingsView>>
  saveConnection: (update: ConnectionUpdatePayload) => Promise<ApiResult<SettingsView>>
  setAuthMode: (mode: AuthMode) => Promise<ApiResult<SettingsView>>
  setToken: (token: string) => Promise<ApiResult<SettingsView>>
  setPassword: (args: { email: string; password: string }) => Promise<ApiResult<SettingsView>>
  signOut: () => Promise<ApiResult<SettingsView>>
  testConnection: () => Promise<ApiResult<string>>
  listGames: () => Promise<ApiResult<GameOptionView[]>>
  publishListing: (input: unknown) => Promise<ApiResult<PublishResultView>>
  listTemplates: () => Promise<ApiResult<ListingTemplateView[]>>
  saveTemplate: (t: ListingTemplateView) => Promise<ApiResult<ListingTemplateView[]>>
  deleteTemplate: (name: string) => Promise<ApiResult<ListingTemplateView[]>>
  listBulkAccounts: () => Promise<ApiResult<BulkAccountView[]>>
  importBulkAccounts: (text: string) => Promise<ApiResult<BulkImportResult>>
  setBulkAccountsUsed: (args: {
    ids: string[]
    used: boolean
  }) => Promise<ApiResult<BulkAccountView[]>>
  removeBulkAccounts: (ids: string[]) => Promise<ApiResult<BulkAccountView[]>>
  clearBulkAccounts: () => Promise<ApiResult<BulkAccountView[]>>
}

interface Window {
  eldorado: EldoradoBridge
}
