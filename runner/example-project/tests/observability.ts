import { test as base, expect, type Request } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

interface NetworkEntry {
  startedDateTime: string;
  time: number;
  request: { method: string; url: string; headers: { name: string; value: string }[] };
  response: { status: number; statusText: string; headers: { name: string; value: string }[] };
}

function headers(value: Record<string, string>): { name: string; value: string }[] {
  return Object.entries(value).map(([name, headerValue]) => ({ name, value: headerValue }));
}

export const test = base.extend<{ failureEvidence: void }>({
  failureEvidence: [async ({ page }, use, testInfo) => {
    const consoleLines: string[] = [];
    const networkEntries: NetworkEntry[] = [];
    const requestStarted = new WeakMap<Request, number>();

    page.on('console', (message) => {
      consoleLines.push(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: message.type(),
        text: message.text(),
        location: message.location(),
      }));
    });
    page.on('request', (request) => requestStarted.set(request, Date.now()));
    page.on('response', async (response) => {
      const request = response.request();
      const started = requestStarted.get(request) ?? Date.now();
      networkEntries.push({
        startedDateTime: new Date(started).toISOString(),
        time: Date.now() - started,
        request: { method: request.method(), url: request.url(), headers: headers(await request.allHeaders()) },
        response: { status: response.status(), statusText: response.statusText(), headers: headers(await response.allHeaders()) },
      });
    });
    page.on('requestfailed', (request) => {
      const started = requestStarted.get(request) ?? Date.now();
      networkEntries.push({
        startedDateTime: new Date(started).toISOString(),
        time: Date.now() - started,
        request: { method: request.method(), url: request.url(), headers: [] },
        response: { status: 0, statusText: request.failure()?.errorText ?? 'Request failed', headers: [] },
      });
    });

    await use();

    if (testInfo.status === testInfo.expectedStatus) return;

    const consolePath = testInfo.outputPath('browser-console.log');
    const networkPath = testInfo.outputPath('network.har');
    await writeFile(consolePath, `${consoleLines.join('\n')}\n`, 'utf8');
    await writeFile(networkPath, JSON.stringify({ log: { version: '1.2', creator: { name: 'TestManager Runner', version: '1' }, entries: networkEntries } }, null, 2), 'utf8');
    await testInfo.attach('browser-console', { path: consolePath, contentType: 'application/x-ndjson' });
    await testInfo.attach('network', { path: networkPath, contentType: 'application/json' });

    if (!page.isClosed()) {
      const snapshot = await page.evaluate(() => {
        const importantElements = [document.documentElement, document.body, document.activeElement]
          .filter((element): element is Element => element instanceof Element);
        const computedStyles = importantElements.map((element) => {
          const style = getComputedStyle(element);
          return {
            selector: element === document.documentElement ? 'html' : element === document.body ? 'body' : ':focus',
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            color: style.color,
            backgroundColor: style.backgroundColor,
            font: style.font,
            width: style.width,
            height: style.height,
          };
        });
        return { html: document.documentElement.outerHTML, computedStyles };
      });
      const serialized = JSON.stringify(snapshot).replace(/</g, '\\u003c');
      const domPath = testInfo.outputPath('dom-snapshot.html');
      await writeFile(domPath, `<!doctype html><meta charset="utf-8"><script type="application/json" id="tm-computed-styles">${serialized}</script>${snapshot.html}`, 'utf8');
      await testInfo.attach('dom-snapshot', { path: domPath, contentType: 'text/html' });
    }

    if (process.env.TM_PAUSE_ON_FAILURE === '1' && !page.isClosed()) {
      console.log('[TM_PAUSE_ON_FAILURE] Test gagal. Browser dipertahankan untuk inspeksi; tekan Resume di Playwright Inspector untuk menyelesaikan job.');
      await page.pause();
    }
  }, { auto: true }],
});

export { expect };
