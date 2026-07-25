import { contextBridge, ipcRenderer } from 'electron'

/**
 * Renderer-facing API. The UI never touches the network, credentials, or the
 * Eldorado endpoints directly — it only calls these typed IPC bridges.
 */
const api = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveConnection: (update: unknown) => ipcRenderer.invoke('settings:saveConnection', update),
  setAuthMode: (mode: string) => ipcRenderer.invoke('auth:setMode', mode),
  setToken: (token: string) => ipcRenderer.invoke('auth:setToken', token),
  setPassword: (args: { email: string; password: string }) =>
    ipcRenderer.invoke('auth:setPassword', args),
  signOut: () => ipcRenderer.invoke('auth:signOut'),
  testConnection: () => ipcRenderer.invoke('connection:test'),
  listGames: () => ipcRenderer.invoke('games:list'),
  publishListing: (input: unknown) => ipcRenderer.invoke('listing:publish', input),
  listTemplates: () => ipcRenderer.invoke('templates:list'),
  saveTemplate: (t: unknown) => ipcRenderer.invoke('templates:save', t),
  deleteTemplate: (name: string) => ipcRenderer.invoke('templates:delete', name),
  listBulkAccounts: () => ipcRenderer.invoke('bulk:list'),
  importBulkAccounts: (text: string) => ipcRenderer.invoke('bulk:import', text),
  setBulkAccountsUsed: (args: { ids: string[]; used: boolean }) =>
    ipcRenderer.invoke('bulk:setUsed', args),
  removeBulkAccounts: (ids: string[]) => ipcRenderer.invoke('bulk:remove', ids),
  clearBulkAccounts: () => ipcRenderer.invoke('bulk:clear')
}

contextBridge.exposeInMainWorld('eldorado', api)

export type ExposedApi = typeof api
