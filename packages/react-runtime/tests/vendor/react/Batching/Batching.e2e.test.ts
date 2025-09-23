import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import { findProjectRoot } from '@/tests/utils/path';
import shellExec from '@/tests/utils/shellExec';
import { isPortAvailable, waitForPort } from '@/tests/utils/waitForPort';

const __filename = fileURLToPath(import.meta.url);

const INDEX_HTML = fs.readFileSync(
  path.dirname(__filename) + '/fixtures/index.html',
  'utf-8'
);
const INDEX_JSX = fs.readFileSync(
  path.dirname(__filename) + '/fixtures/index.tsx',
  'utf-8'
);
const VITE_CONFIG_JS = fs.readFileSync(
  path.dirname(__filename) + '/fixtures/vite.config.ts',
  'utf-8'
);

// TODO: think about abstracting this away for other tests.
const PROJECT_ROOT = findProjectRoot(path.dirname(__filename));
const ARTIFACTS_ROOT = path.resolve(PROJECT_ROOT, 'tests/artifacts/playwright');

const APP_DIR = path.resolve(ARTIFACTS_ROOT, 'Batching');
const APP_PORT = 3001;
const APP_URL = 'http://localhost';

let devServer: ReturnType<typeof spawn>;
// eslint-disable-next-line vitest/require-hook
let currentPort = APP_PORT;

const getCurrentUrl = () => `${APP_URL}:${String(currentPort)}`;

// Run tests in serial, mode because they share the same dev server and app directory. running in parallel requires multiple servers and app dirs, which is too much work for this test.
// eslint-disable-next-line vitest/require-hook
test.describe.configure({ mode: 'serial' });

//
// eslint-disable-next-line vitest/require-hook
test.describe('React Batching', () => {
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
    if (!available) currentPort++;

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
  test('React batching with timeouts', async ({ page }) => {
    await page.goto(getCurrentUrl());

    const count = page.getByTestId('count');
    await expect(count).toHaveText('4');
  });
});
