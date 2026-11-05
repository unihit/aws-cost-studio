/**
 * Dev-only visual smoke test: drives headless Chrome over the DevTools protocol.
 * Usage: node scripts/cdp-screenshot.mjs [url] [outputDir]
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL = process.argv[2] ?? "http://127.0.0.1:5173/";
const OUT = resolve(process.argv[3] ?? "screenshots");
const PORT = 9333;
const PROFILE = resolve(process.env.TEMP ?? ".", "acs-cdp-profile");
const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

mkdirSync(OUT, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    "--window-size=1440,1000",
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function waitForChrome() {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return;
    } catch {
      // keep waiting
    }
    await delay(250);
  }
  throw new Error("Chrome DevTools endpoint did not start");
}

let id = 0;
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  const events = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    } else if (message.method && events.has(message.method)) {
      for (const handler of events.get(message.method)) handler(message.params);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolveSend, reject) => {
      const commandId = ++id;
      pending.set(commandId, (message) => {
        if (message.error) reject(new Error(`${method}: ${message.error.message}`));
        else resolveSend(message.result);
      });
      ws.send(JSON.stringify({ id: commandId, method, params }));
    });
  const once = (method) =>
    new Promise((resolveEvent) => {
      const handler = (params) => {
        events.get(method).delete(handler);
        resolveEvent(params);
      };
      if (!events.has(method)) events.set(method, new Set());
      events.get(method).add(handler);
    });
  return { ws, send, once };
}

async function waitForLoad(page) {
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  const loaded = page.once("Page.loadEventFired");
  await page.send("Page.navigate", { url: URL });
  await Promise.race([loaded, delay(8000)]);
  await page.send("Runtime.evaluate", {
    expression: "document.fonts && document.fonts.ready ? document.fonts.ready.then(()=>true) : true",
    awaitPromise: true,
  });
  await delay(700);
}

async function shot(page, name, fullPage = true) {
  if (fullPage) {
    const metrics = await page.send("Page.getLayoutMetrics");
    const size = metrics.cssContentSize ?? metrics.contentSize;
    const result = await page.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: Math.ceil(size.width), height: Math.ceil(size.height), scale: 1 },
    });
    const file = resolve(OUT, `${name}.png`);
    writeFileSync(file, Buffer.from(result.data, "base64"));
    console.log(`wrote ${file} (${size.width}x${size.height})`);
  } else {
    const result = await page.send("Page.captureScreenshot", { format: "png" });
    const file = resolve(OUT, `${name}.png`);
    writeFileSync(file, Buffer.from(result.data, "base64"));
    console.log(`wrote ${file}`);
  }
}

const evaluate = async (page, expression) => {
  const result = await page.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};

try {
  await waitForChrome();
  const created = await (
    await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" })
  ).json();
  const page = connect(created.webSocketDebuggerUrl);
  await new Promise((resolveOpen) => page.ws.addEventListener("open", resolveOpen, { once: true }));

  await waitForLoad(page);

  // Apply the high-availability preset through the real UI.
  await evaluate(
    page,
    `(() => { const b=[...document.querySelectorAll('button')].find(e=>e.textContent.includes('고가용성 프로덕션 웹')); b && b.click(); return !!b; })()`,
  );
  await delay(1500);
  await shot(page, "dashboard-dark");

  // Open the catalog for a drawer screenshot.
  await evaluate(
    page,
    `(() => { const b=[...document.querySelectorAll('button')].find(e=>e.textContent.includes('서비스 추가')); b && b.click(); return !!b; })()`,
  );
  await delay(700);
  await shot(page, "catalog-dark", false);
  await evaluate(page, `document.querySelector('[role="dialog"] button[aria-label="서비스 추가 닫기"]').click()`);

  // Switch to light mode and capture the populated dashboard.
  await evaluate(
    page,
    `(() => { const b=document.querySelector('button[aria-label="라이트 모드로 전환"]'); b && b.click(); return !!b; })()`,
  );
  await delay(900);
  await shot(page, "dashboard-light");

  // Mobile viewport capture.
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await delay(700);
  await shot(page, "dashboard-mobile", true);

  page.ws.close();
} finally {
  chrome.kill();
  await delay(500);
  try {
    rmSync(PROFILE, { recursive: true, force: true });
  } catch {
    // Profile cleanup is best-effort.
  }
}
