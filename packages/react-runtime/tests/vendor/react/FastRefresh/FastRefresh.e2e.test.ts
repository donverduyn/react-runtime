// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable vitest/require-hook */
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { findProjectRoot } from '@/tests/utils/path';
import shellExec from '@/tests/utils/shellExec';
import { isPortAvailable, waitForPort } from '@/tests/utils/waitForPort';

const __filename = fileURLToPath(import.meta.url);

const APP_JSX = fs.readFileSync(
  path.dirname(__filename) + '/fixtures/App.tsx',
  'utf-8'
);
const INDEX_HTML = fs.readFileSync(
  path.dirname(__filename) + '/fixtures/index.html',
  'utf-8'
);
const INDEX_JSX = fs.readFileSync(
  path.dirname(__filename) + '/fixtures/index.tsx',
  'utf-8'
);
const MEMO_CHILD_JSX = fs.readFileSync(
  path.dirname(__filename) + '/fixtures/Child.tsx',
  'utf-8'
);
const VITE_CONFIG_JS = fs.readFileSync(
  path.dirname(__filename) + '/fixtures/vite.config.ts',
  'utf-8'
);

// TODO: think about abstracting this away for other tests.
const PROJECT_ROOT = findProjectRoot(path.dirname(__filename));
const ARTIFACTS_ROOT = path.resolve(PROJECT_ROOT, 'tests/artifacts/playwright');

const APP_DIR = path.resolve(ARTIFACTS_ROOT, 'FastRefresh');
const APP_PORT = 3001;
const APP_URL = `http://localhost`;

let devServer: ReturnType<typeof spawn>;
let currentPort = APP_PORT;
const getCurrentUrl = () => `${APP_URL}:${String(currentPort)}`;

// Run tests in serial, mode because they share the same dev server and app directory. running in parallel requires multiple servers and app dirs, which is too much work for this test.
test.describe.configure({ mode: 'serial' });

//
test.describe('FastRefresh', () => {
  test.beforeAll(async () => {
    // Clean up old artifacts
    // if (fs.existsSync(APP_DIR)) {
    //   for (const entry of fs.readdirSync(APP_DIR)) {
    //     if (entry === '.yarn-cache') continue; // skip cache
    //     fs.rmSync(path.join(APP_DIR, entry), { recursive: true, force: true });
    //   }
    // }
    // Recreate artifacts directory
    if (!fs.existsSync(APP_DIR)) {
      fs.mkdirSync(APP_DIR, { recursive: true });
    }

    // Write app files
    fs.writeFileSync(path.join(APP_DIR, 'index.html'), INDEX_HTML);
    fs.writeFileSync(path.join(APP_DIR, 'index.tsx'), INDEX_JSX);
    fs.writeFileSync(path.join(APP_DIR, 'App.tsx'), APP_JSX);
    fs.writeFileSync(path.join(APP_DIR, 'Child.tsx'), MEMO_CHILD_JSX);

    // Write vite.config.ts
    fs.writeFileSync(path.join(APP_DIR, 'vite.config.ts'), VITE_CONFIG_JS);

    // Install dependencies
    execSync('yarn init -y', { cwd: APP_DIR, stdio: 'ignore' });
    execSync(
      'yarn add react react-dom @vitejs/plugin-react vite --cache-folder .yarn-cache',
      {
        cwd: APP_DIR,
        stdio: 'ignore',
      }
    );

    const available = await isPortAvailable(currentPort);
    if (available) currentPort++;

    // Start dev server
    devServer = spawn(
      'npx',
      ['vite', '--host', '--port', String(currentPort)],
      {
        cwd: APP_DIR,
        stdio: 'ignore',
        detached: true,
      }
    );

    // Wait for dev server to be ready
    if (!(await waitForPort(currentPort))) {
      throw new Error(
        `Port ${String(currentPort)} is not available. Please free the port and try again.`
      );
    }
  });

  test.afterAll(async () => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (devServer && devServer.pid) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 0));
        void shellExec(`fuser -k ${String(currentPort)}/tcp`);
      } catch {
        // do nothing
      }
    }
  });

  test.afterEach(() => {
    // Restore original App.tsx after each test
    fs.writeFileSync(path.join(APP_DIR, 'App.tsx'), APP_JSX);
  });

  test('Fast Refresh keeps component state', async ({ page }) => {
    await page.goto(getCurrentUrl());

    // Trigger a state change by clicking the increment button
    await page.getByTestId('inc').click();

    // Verify count is 1
    await expect(page.getByTestId('count')).toHaveText('1');

    // Swap testid to force Fast Refresh
    const appCode = APP_JSX.replace(
      "<div data-testid='app'>",
      "<div data-testid='app-1'>"
    );

    // Modify App.tsx to trigger Fast Refresh
    fs.writeFileSync(path.join(APP_DIR, 'App.tsx'), appCode);

    // Verify Fast Refresh happened and count is still 1
    await expect(page.getByTestId('app-1')).toBeVisible();
    await expect(page.getByTestId('count')).toHaveText('1');
  });

  test('Fast Refresh keeps id (useId)', async ({ page }) => {
    await page.goto(getCurrentUrl());

    // Get the initial component instance id from useId
    const beforeId = await page.getByTestId('inst-id').textContent();

    // Swap testid to force Fast Refresh
    const appCode = APP_JSX.replace(
      "<div data-testid='app'>",
      "<div data-testid='app-1'>"
    );

    // Modify App.tsx to trigger Fast Refresh
    fs.writeFileSync(path.join(APP_DIR, 'App.tsx'), appCode);

    // Get the component instance id after Fast Refresh
    const afterId = await page.getByTestId('inst-id').textContent();

    // Verify Fast Refresh happened and instance id is the same
    await expect(page.getByTestId('app-1')).toBeVisible();
    expect(beforeId).toBe(afterId);
  });

  test('Fast Refresh only calls cleanup and effects on dep changes', async ({
    page,
  }) => {
    // Attach to Chrome DevTools Protocol to listen for console logs
    const client = await page.context().newCDPSession(page);
    await client.send('Runtime.enable');

    // Collect console log events
    const consoleEvents: string[] = [];
    client.on('Runtime.consoleAPICalled', (event) => {
      if (event.type === 'log') {
        consoleEvents.push(
          event.args.map((arg) => arg.value as string).join(' ')
        );
      }
    });

    // Go to the app and increment the count
    await page.goto(getCurrentUrl());
    await expect(page.getByTestId('count')).toHaveText('0');

    // order is useState, useMemo, useRef, useLayoutEffect, useEffect
    // after mount effects should have run
    expect(consoleEvents).toStrictEqual([
      // first render
      // triggered twice
      'useState: 0',
      'useState: 0',
      'useState result: 0',
      // triggered twice
      'useMemo: 0',
      'useMemo: 0',
      'useMemo result: 0',
      'useRef: 0',
      'useRef result: 0',
      'useCallback: 0',
      'useCallback result: 0',
      // second render
      'useState result: 0', // kept value
      'useMemo result: 0', // kept value
      'useRef: 1', // value gets passed but is omitted (normal)
      'useRef result: 0', // kept value
      'useCallback: 0', // intentionally stale (depends on dep array)
      'useCallback result: 0', // intentionally stale

      // dry running effects (happens after descendents finished second render)
      'useLayoutEffect: 1', // first function is omitted, second used, bottom to top
      'useEffect: 1', // first function is omitted, second used, bottom to top
      'useLayoutEffect cleanup: 1', // top to bottom
      'useEffect cleanup: 1', // top to bottom
      // as usual
      'useLayoutEffect: 1', // pre-commit -> bottom to top
      'useEffect: 1', // post-commit -> bottom to top again
    ]);

    // Clear console events
    consoleEvents.splice(0, consoleEvents.length);

    // Swap testid to force Fast Refresh
    const appCode = APP_JSX.replace(
      "<div data-testid='app'>",
      "<div data-testid='app-1'>"
    );

    // Modify App.tsx to trigger Fast Refresh
    fs.writeFileSync(path.join(APP_DIR, 'App.tsx'), appCode);

    // Wait for the refreshed app to be rendered
    await page.waitForSelector("[data-testid='app-1']");

    //* effects are not running
    expect(consoleEvents).toStrictEqual([
      // first render after Fast Refresh
      'useState result: 0', // kept value
      // triggered twice
      'useMemo: 2', // memo re-runs
      'useMemo: 2',
      'useMemo result: 2',
      'useRef: 2', // new value omitted (normal)
      'useRef result: 0', // kept value
      'useCallback: 2', // callback updated
      'useCallback result: 2',
      // second render
      'useState result: 0', // kept value
      'useMemo result: 2', // kept value
      'useRef: 3', // 4 renders total coming from 0
      'useRef result: 0', // kept value
      'useCallback: 2', // kept value
      'useCallback result: 2',
    ]);
  });
});
