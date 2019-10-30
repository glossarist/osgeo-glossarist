import * as path from 'path';

import { app } from 'electron';

import { SettingManager } from 'sse/settings/main';
import { WindowOpenerParams, openWindow, getWindowByTitle, windows } from 'sse/main/window';
import { makeEndpoint, makeWindowEndpoint } from 'sse/api/main';
import { GitController, setRepoUrl, initRepo } from 'sse/storage/main/git-controller';

import { Concept } from '../models/concept';
import { initStorage } from './storage';


// Ensure only one instance of the app can run at a time on given user’s machine
if (!app.requestSingleInstanceLock()) { app.exit(0); }

const isMacOS = process.platform === 'darwin';


const APP_TITLE = "OSGeo Glossary Manager";
//const APP_HELP_ROOT = "https://www.ituob.org/_app_help/";

const USER_DATA_DIR = app.getPath('userData');
const WORK_DIR = path.join(USER_DATA_DIR, 'osgeo-glossarist');
const DEFAULT_REPO_URL = 'https://github.com/geolexica/osgeo-glossary';
const CORS_PROXY_URL = 'https://cors.isomorphic-git.org';

const SETTINGS_PATH = path.join(USER_DATA_DIR, 'osgeo-glossarist-settings.yaml');

const WELCOME_SCREEN_WINDOW_OPTS: WindowOpenerParams = {
  component: 'welcome',
  title: 'Welcome',
  componentParams: `defaultRepoUrl=${DEFAULT_REPO_URL || ''}`,
  dimensions: { width: 800, height: 600, minWidth: 600, minHeight: 600 },
  frameless: true,
};


app.disableHardwareAcceleration();

const settings = new SettingManager(SETTINGS_PATH);
settings.setUpAPIEndpoints();

// Quit application when all windows are closed
app.on('window-all-closed', () => {
  // On macOS it is common for applications to stay open until the user explicitly quits
  if (!isMacOS) {
    app.quit();
  }
});

app.whenReady().
then(() => setRepoUrl(WELCOME_SCREEN_WINDOW_OPTS, settings)).
then(repoUrl => {
  return Promise.all([
    (async () => {
      await openHomeWindow();

      // Reopen home window on app reactivation
      app.on('activate', () => {
        // On macOS it is common to re-create a window even after all windows have been closed
        if (windows.length < 1) {
          openHomeWindow();
        }
      });
    })(),
    initRepo(WORK_DIR, repoUrl || DEFAULT_REPO_URL, CORS_PROXY_URL),
  ]);
}).
then(results => {
  const gitCtrl: GitController = results[1];

  initStorage(WORK_DIR).then(storage => {
    messageHome('app-loaded');

    gitCtrl.setUpAPIEndpoints();

    storage.setUpAPIEndpoints((notify: string[]) => {});

    makeEndpoint<Concept[]>('search-concepts', async ({ query }: { query?: string }) => {
      return Object.values((await storage.findObjects(query)).concepts);
    });

    makeWindowEndpoint('concept', (id: string) => ({
      component: 'concept',
      title: `Concept ${id}`,
      componentParams: `id=${id}`,
      frameless: true,
      dimensions: { width: 800, height: 600, minWidth: 700, minHeight: 500 },
    }));

    makeWindowEndpoint('data-synchronizer', () => ({
      component: 'dataSynchronizer',
      title: 'Merge Changes',
      dimensions: { width: 800, minWidth: 600, height: 640, minHeight: 640 },
    }));

  });
});


function messageHome(eventName: string) {
  const homeWindow = getWindowByTitle(APP_TITLE);
  if (homeWindow !== undefined) {
    homeWindow.webContents.send(eventName);
  }
}


async function openHomeWindow() {
  return await openWindow({
    component: 'home',
    title: APP_TITLE,
    dimensions: { width: 400, height: 500, minWidth: 300, minHeight: 300 },
    frameless: true,
  });
}
