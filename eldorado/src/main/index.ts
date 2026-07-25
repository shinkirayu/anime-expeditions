import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import {
  getSettings,
  saveConnection,
  setAuthMode,
  clearAuth,
  type ConnectionUpdate
} from './settings'
import { saveToken, savePassword, clearTokenCache } from './api/auth'
import { getAccountGames } from './api/games'
import { publishListing, testConnection, type PublishInput } from './api/listings'
import { getTemplates, saveTemplate, deleteTemplate } from './templates'
import {
  getAccounts,
  importAccounts,
  setUsed,
  removeAccounts,
  clearAccounts
} from './bulkAccounts'
import type { ApiResult, AuthMode, ListingTemplate } from './api/types'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 900,
    minHeight: 640,
    show: false,
    backgroundColor: '#0f1115',
    title: 'Eldorado Auto Lister',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** Wraps a handler so thrown errors become a serializable ApiResult. */
async function guard<T>(fn: () => Promise<T>): Promise<ApiResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function registerIpc(): void {
  ipcMain.handle('settings:get', () => guard(async () => getSettings()))

  ipcMain.handle('settings:saveConnection', (_e, update: ConnectionUpdate) =>
    guard(async () => saveConnection(update))
  )

  ipcMain.handle('auth:setMode', (_e, mode: AuthMode) =>
    guard(async () => {
      clearTokenCache()
      return setAuthMode(mode)
    })
  )

  ipcMain.handle('auth:setToken', (_e, token: string) => guard(async () => saveToken(token)))

  ipcMain.handle('auth:setPassword', (_e, args: { email: string; password: string }) =>
    guard(() => savePassword(args.email, args.password))
  )

  ipcMain.handle('auth:signOut', () =>
    guard(async () => {
      clearTokenCache()
      return clearAuth()
    })
  )

  ipcMain.handle('connection:test', () => guard(() => testConnection()))

  ipcMain.handle('games:list', () => guard(() => getAccountGames()))

  ipcMain.handle('listing:publish', (_e, input: PublishInput) => guard(() => publishListing(input)))

  ipcMain.handle('templates:list', () => guard(async () => getTemplates()))
  ipcMain.handle('templates:save', (_e, t: ListingTemplate) => guard(async () => saveTemplate(t)))
  ipcMain.handle('templates:delete', (_e, name: string) => guard(async () => deleteTemplate(name)))

  ipcMain.handle('bulk:list', () => guard(async () => getAccounts()))
  ipcMain.handle('bulk:import', (_e, text: string) => guard(async () => importAccounts(text)))
  ipcMain.handle('bulk:setUsed', (_e, a: { ids: string[]; used: boolean }) =>
    guard(async () => setUsed(a.ids, a.used))
  )
  ipcMain.handle('bulk:remove', (_e, ids: string[]) => guard(async () => removeAccounts(ids)))
  ipcMain.handle('bulk:clear', () => guard(async () => clearAccounts()))
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
