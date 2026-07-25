import type {
  ApiResult,
  AuthMode,
  BulkAccount,
  GameOption,
  ListingTemplate,
  Settings
} from '../main/api/types'
import type { ImportResult } from '../main/bulkAccounts'
import type { PublishInput, PublishResult } from '../main/api/listings'
import type { ConnectionUpdate } from '../main/settings'

export interface EldoradoApi {
  getSettings: () => Promise<ApiResult<Settings>>
  saveConnection: (update: ConnectionUpdate) => Promise<ApiResult<Settings>>
  setAuthMode: (mode: AuthMode) => Promise<ApiResult<Settings>>
  setToken: (token: string) => Promise<ApiResult<Settings>>
  setPassword: (args: { email: string; password: string }) => Promise<ApiResult<Settings>>
  signOut: () => Promise<ApiResult<Settings>>
  testConnection: () => Promise<ApiResult<string>>
  listGames: () => Promise<ApiResult<GameOption[]>>
  publishListing: (input: PublishInput) => Promise<ApiResult<PublishResult>>
  listTemplates: () => Promise<ApiResult<ListingTemplate[]>>
  saveTemplate: (t: ListingTemplate) => Promise<ApiResult<ListingTemplate[]>>
  deleteTemplate: (name: string) => Promise<ApiResult<ListingTemplate[]>>
  listBulkAccounts: () => Promise<ApiResult<BulkAccount[]>>
  importBulkAccounts: (text: string) => Promise<ApiResult<ImportResult>>
  setBulkAccountsUsed: (args: { ids: string[]; used: boolean }) => Promise<ApiResult<BulkAccount[]>>
  removeBulkAccounts: (ids: string[]) => Promise<ApiResult<BulkAccount[]>>
  clearBulkAccounts: () => Promise<ApiResult<BulkAccount[]>>
}

declare global {
  interface Window {
    eldorado: EldoradoApi
  }
}
