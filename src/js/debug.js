// import fs from 'fs';
// import os from 'os';
// import path from 'path';
// import electron from 'electron';
import request from './request';
import store from './store';
import getTranslate from './getTranslate';

const fs = require('fs');
const os = require('os');
const path = require('path');
const electron = require('electron');

const { app, dialog } = electron.remote;

function genDate() {
  return new Date().toLocaleDateString();
}

function genTime(isFilename) {
  const date = new Date();
  const time = date.toLocaleTimeString();

  return isFilename
    ? time.replace(/:/g, '-')
    : time;
}

const appName = 'vk-desktop';
const logsPath = getLibraryDefaultDir();

if (!fs.existsSync(logsPath)) {
  fs.mkdirSync(logsPath, { recursive: true });
}

const logName = `${genDate()} ${genTime(true)}.log`;
const logPath = path.join(logsPath, logName);
const fileDescriptor = fs.openSync(logPath, 'a+');

export default function debug(...textChunks) {
  fs.appendFileSync(fileDescriptor, `[${genTime()}] ${textChunks.join('\n')}\n`);
}

// =================

const errorCache = new Set();

async function onError(error) {
  let type = error.type === 'error' ? 'UncaughtError' : 'UnhandledRejection';
  let message;

  if (error.error) {
    if (error.error.stack) {
      type = error.error.name;
      message = error.error.stack;
    } else {
      message = typeof error.error === 'string'
        ? error.error
        : JSON.stringify(error.error, null, 2);

      if (error.filename) {
        message += `\n\nfrom ${error.filename}:${error.lineno}:${error.colno}`;
      }
    }
  } else if (error.reason) {
    message = error.reason.stack;
    type = error.reason.name;
  } else {
    // eslint-disable-next-line prefer-destructuring
    message = error.message;
  }

  debug(`[${type}] ${message}`);

  if (errorCache.has(message)) {
    return;
  } else {
    errorCache.add(message);
  }

  const { response } = await dialog.showMessageBox({
    type: 'error',
    title: getTranslate('error_dialog_title'),
    message: getTranslate('error_dialog_message'),
    detail: message,
    cancelId: 1,

    buttons: ['Отправить отчет', 'Закрыть']
  });

  if (response === 0) {
    const title = encodeURIComponent(message.split('\n')[0]);
    const encodedMessage = encodeURIComponent(message || 'empty');
    const user_id = store.state.users.activeUserID || -1;

    request({
      host: API_HOST,
      path: `/sendLogs?title=${title}&message=${encodedMessage}&user_id=${user_id}`,
      method: 'POST'
    }, {
      multipart: {
        logs: {
          value: fs.createReadStream(logPath),
          filename: logName,
          contentType: 'text/plain'
        }
      }
    });
  }
}

if (!DEV_MODE) {
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onError);
}

// =================

function getLibraryDefaultDir() {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library/Logs', appName);
  }

  return path.join(getUserData(), 'logs');
}

function getUserData() {
  if (app.name !== appName) {
    return path.join(getAppData(), appName);
  }

  return app.getPath('userData') || path.join(getAppData(), appName);
}

function getAppData() {
  const appData = app.getPath('appData');

  if (appData) {
    return appData;
  }

  const home = os.homedir();

  switch (process.platform) {
    case 'darwin':
      return path.join(home, 'Library/Application Support');

    case 'win32':
      return process.env.APPDATA || path.join(home, 'AppData/Roaming');

    default:
      return process.env.XDG_CONFIG_HOME || path.join(home, '.config');
  }
}
