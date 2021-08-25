/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path, { join } from 'path';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import Store from 'electron-store';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { fork } from 'child_process';
import {
  ID_RENDERER,
  CHAN_RENDERER_TO_WORKER,
  CHAN_WORKER_TO_RENDERER,
  CHAN_WORKER_ERROR,
  TYPE_ERROR,
  ID_MAIN,
  TYPE_SETTINGS,
  ID_WORKER,
  CHAN_RENDERER_TO_MAIN,
  TYPE_EDIT_SETTINGS,
  CHAN_SHELL_OPEN_EXTERNAL,
  CHAN_APP_EXIT,
  CHAN_APP_RELAUNCH,
  CHAN_DIALOG_SHOWSAVE,
  SETTINGS_PROXY_0_0_0,
} from './types';

/**
 * Path
 * - Development: {appData}/Electron
 * - Production: {appData}/{appName}
 */
const store = new Store({
  defaults: {
    proxy: {
      use: false,
      https: {
        protocol: '',
        host: '',
        port: 0,
      },
    },
    security: {
      cert: '',
      rejectUnauthorized: true,
    }
  },
  migrations: {
    '1.15.0': (store) => {
      const proxy = store.get('proxy') as SETTINGS_PROXY_0_0_0;
      const { rejectUnauthorized, ...proxyNew } = proxy;
      if (rejectUnauthorized !== undefined) {
        store.set('proxy', proxyNew);
        store.set('security.rejectUnauthorized', rejectUnauthorized);
      }
    }
  }
});
const { cert, rejectUnauthorized } = store.get('security');

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map((name) => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    minWidth: 1366,
    minHeight: 768,
    webPreferences:
      (process.env.NODE_ENV === 'development' ||
        process.env.E2E_BUILD === 'true') &&
      process.env.ERB_SECURE !== 'true'
        ? {
            nodeIntegration: true,
            enableRemoteModule: true,
          }
        : {
            preload: path.join(__dirname, 'dist/renderer.prod.js'),
            enableRemoteModule: true,
          },
  });
  mainWindow.setMenu(null);

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

const workerPath =
  process.env.NODE_ENV === 'development'
    ? 'app/worker.js'
    : 'app.asar/dist/worker.js';
const workerCwd =
  process.env.NODE_ENV === 'development' ? undefined : join(__dirname, '..');
const envWorker = Object.assign({}, process.env, {
  NODE_EXTRA_CA_CERTS: cert,
  NODE_TLS_REJECT_UNAUTHORIZED: Number(rejectUnauthorized).toString(),
});
const worker = fork(workerPath, { cwd: workerCwd, env: envWorker });

worker.on('message', (msg) => {
  const { dst, type } = msg;
  if (dst === ID_RENDERER) {
    if (mainWindow === null) {
      return;
    }
    switch (type) {
      case TYPE_ERROR: {
        const { error } = msg;
        mainWindow.webContents.send(CHAN_WORKER_ERROR, error);
        break;
      }
      default: {
        mainWindow.webContents.send(CHAN_WORKER_TO_RENDERER, msg);
        break;
      }
    }
  }
  if (dst === ID_MAIN) {
    switch (type) {
      case TYPE_SETTINGS: {
        worker.send({
          src: ID_MAIN,
          dst: ID_WORKER,
          type: TYPE_SETTINGS,
          settings: store.store,
        });
        break;
      }
      default: {
        break;
      }
    }
  }
});

ipcMain.on(CHAN_APP_EXIT, (_event, _args) => {
  app.exit();
});

ipcMain.on(CHAN_APP_RELAUNCH, (_event, _args) => {
  app.relaunch();
});

ipcMain.handle(CHAN_DIALOG_SHOWSAVE, (_event, args) => {
  const { defaultPath, filters } = args;
  const focusedWindow = BrowserWindow.getFocusedWindow();
  return focusedWindow && dialog.showSaveDialog(
    focusedWindow,
    { defaultPath, filters },
  );
});

ipcMain.on(CHAN_SHELL_OPEN_EXTERNAL, (_event, args) => {
  const { url, options } = args;
  shell.openExternal(url, options);
});

ipcMain.on(CHAN_RENDERER_TO_MAIN, (_event, msg) => {
  const { type } = msg;
  switch (type) {
    case TYPE_EDIT_SETTINGS: {
      store.openInEditor();
      break;
    }
    default: {
      break;
    };
  }
});

ipcMain.on(CHAN_RENDERER_TO_WORKER, (_event, msg) => {
  worker.send(msg);
});

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

if (process.env.E2E_BUILD === 'true') {
  // eslint-disable-next-line promise/catch-or-return
  app.whenReady().then(createWindow);
} else {
  app.on('ready', createWindow);
}

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});
