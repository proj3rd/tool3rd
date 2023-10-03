import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { INITIAL_SETTINGS } from '../lib/settings'
import createWorker from './worker?nodeWorker'
import { Worker } from 'worker_threads'
import {
  Message,
  OpenFolderRequest,
  SaveLocationRequest,
  SaveLocationResponse,
  SettingsGetRequest,
  SettingsSetRequest
} from '../lib/message'
import { z } from 'zod'

const settingsPath = join(app.getPath('userData'), 'settings.json')

function createWindow(worker: Worker): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    resizable: false,
    maximizable: false,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Handle message from renderer to main
  ipcMain.handle('message', (_event, msg: unknown) => {
    const messageParseResult = Message.safeParse(msg)
    if (messageParseResult.success) {
      const { dest } = messageParseResult.data
      if (dest === 'main') {
        if (SettingsGetRequest.safeParse(msg).success) {
          return JSON.parse(readFileSync(settingsPath, 'utf8'))
        }
        const settingsSetRequestParseResult = SettingsSetRequest.safeParse(msg)
        if (settingsSetRequestParseResult.success) {
          const { settings } = settingsSetRequestParseResult.data
          writeFileSync(settingsPath, JSON.stringify(settings))
          app.relaunch()
          return
        }
        const openFolderRequestParseResult = OpenFolderRequest.safeParse(msg)
        if (openFolderRequestParseResult.success) {
          const { location } = openFolderRequestParseResult.data
          shell.showItemInFolder(location)
        }
      }
      if (dest === 'worker') {
        worker.postMessage(msg)
      }
    }
  })

  // Handle message from worker to main
  worker.on('message', (msg: unknown) => {
    const messageParseResult = Message.safeParse(msg)
    if (messageParseResult.success) {
      const { dest, channel } = messageParseResult.data
      if (dest === 'main') {
        if (SaveLocationRequest.safeParse(msg).success) {
          const saveLocation = dialog.showSaveDialogSync({
            filters: [{ name: 'Spreadsheet file', extensions: ['xlsx'] }]
          })
          worker.postMessage({
            src: 'main',
            dest: 'worker',
            channel: 'saveLocationResponse',
            saveLocation
          } satisfies z.infer<typeof SaveLocationResponse>)
        }
      }
      if (dest === 'renderer') {
        mainWindow.webContents.send(channel, msg)
      }
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('proj3rd')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  if (!existsSync(settingsPath)) {
    writeFileSync(settingsPath, JSON.stringify(INITIAL_SETTINGS))
  }

  const worker = createWorker({})
  createWindow(worker)

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow(worker)
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
