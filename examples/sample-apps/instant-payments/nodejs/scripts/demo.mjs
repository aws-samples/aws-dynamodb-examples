#!/usr/bin/env node
/**
 * Live demo: DynamoDB-backed flows with colored terminal output and optional HTML report
 * (collapsible request/response blocks via <details>).
 *
 *   npm run demo
 *   BASE_URL=http://localhost:8080 node scripts/demo.mjs
 *   node scripts/demo.mjs --html=demo-report.html   # also writes collapsible HTML
 *   node scripts/demo.mjs --compact                 # one line per HTTP call
 *   NO_COLOR=1 node scripts/demo.mjs                # plain text
 */
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline/promises";

const base = (process.env.BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");

function parseArgs(argv) {
  let htmlOut = null;
  let compact = false;
  let interactive = false;
  let noColor = process.env.NO_COLOR != null && process.env.NO_COLOR !== "";
  for (const a of argv) {
    if (a === "--no-color") noColor = true;
    if (a === "--compact") compact = true;
    if (a === "--interactive" || a === "-i") interactive = true;
    if (a.startsWith("--html=")) htmlOut = a.slice("--html=".length);
  }
  return { htmlOut, compact, interactive, noColor };
}

const opts = parseArgs(process.argv.slice(2));

function createColors(enabled) {
  if (!enabled)
    return new Proxy(
      {},
      {
        get: () => (s) => s,
      },
    );
  const b = (codes) => (s) => `\x1b[${codes}m${s}\x1b[0m`;
  return {
    bold: b("1"),
    dim: b("2"),
    cyan: b("36"),
    green: b("32"),
    yellow: b("33"),
    red: b("31"),
    magenta: b("35"),
    blue: b("34"),
    gray: b("90"),
    bgGray: b("100"),
  };
}

const c = createColors(!opts.noColor);

const runId = `demo_${Date.now()}`;
/** @type {Array<{ step: string, method: string, url: string, requestBody?: unknown, status: number, responseBody: unknown }>} */
const htmlJournal = [];

function banner(title) {
  const w = Math.max(52, title.length + 6);
  const line = "━".repeat(w);
  console.log(
    `\n${c.dim(line)}`,
    `\n${c.bold(c.cyan(`  ${title}`))}`,
    `\n${c.dim(line)}`,
  );
}

function note(...lines) {
  for (const l of lines) console.log(`${c.gray("  →")} ${l}`);
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function statusPaint(status) {
  if (status >= 200 && status < 300) return c.green(String(status));
  if (status >= 400 && status < 500) return c.yellow(String(status));
  if (status >= 500) return c.red(String(status));
  return String(status);
}

/**
 * @param {object} p
 * @param {string} p.step - section label for HTML
 * @param {string} p.method
 * @param {string} p.path - path only (appended to base)
 * @param {unknown} [p.body]
 * @param {number} p.expectStatus
 */
async function exchange({ step, method, path, body, expectStatus }) {
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { _raw: text };
  }

  const record = {
    step,
    method,
    url,
    requestBody: body,
    status: res.status,
    responseBody: json,
  };
  htmlJournal.push(record);

  const summary = `${c.bold(method)} ${c.cyan(path)} ${c.dim("→")} ${statusPaint(res.status)}`;

  if (opts.compact) {
    console.log(`  ${summary}`);
  } else {
    const reqLabel = c.bold("Request");
    const resLabel = c.bold("Response");
    const reqBody =
      body !== undefined ? `${c.dim("│")} ${reqLabel} ${c.dim("(application/json)")}\n${indentBlock(prettyJson(body), "│ ")}` : `${c.dim("│")} ${reqLabel} ${c.dim("(no body)")}`;
    const resBody = `${c.dim("│")} ${resLabel} ${c.dim(`(${res.status})`)}\n${indentBlock(prettyJson(json), "│ ")}`;

    console.log(`\n  ${c.dim("╭─")} ${summary}`);
    console.log(`${c.dim("│")}`);
    console.log(reqBody.split("\n").join("\n"));
    console.log(`${c.dim("│")}`);
    console.log(resBody.split("\n").join("\n"));
    console.log(`  ${c.dim("╰" + "─".repeat(Math.min(72, 20)))}`);
  }

  if (opts.interactive && !opts.compact) {
    const rl = readline.createInterface({ input, output });
    await rl.question(c.dim("  … Enter for next step "));
    rl.close();
    console.log("");
  }

  if (res.status !== expectStatus) {
    throw new Error(`${step}: expected HTTP ${expectStatus} for ${method} ${path}, got ${res.status}`);
  }

  return { status: res.status, json, path: `${method} ${path}` };
}

function indentBlock(text, prefix) {
  return text
    .split("\n")
    .map((line) => `${c.dim(prefix)}${line}`)
    .join("\n");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function writeHtmlReport(filePath) {
  const abs = resolve(process.cwd(), filePath);
  await mkdir(dirname(abs), { recursive: true });
  const out = createWriteStream(abs);

  const header = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Instant Payments demo — HTTP trace</title>
  <style>
    :root { font-family: ui-sans-serif, system-ui, sans-serif; background:#0f1419; color:#e6edf3; }
    body { max-width: 960px; margin: 24px auto; padding: 0 16px 48px; }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 8px; }
    .meta { color:#8b949e; font-size: 0.875rem; margin-bottom: 24px; }
    details {
      border: 1px solid #30363d;
      border-radius: 8px;
      margin-bottom: 12px;
      background: #161b22;
      overflow: hidden;
    }
    summary {
      cursor: pointer;
      padding: 12px 14px;
      font-weight: 600;
      list-style: none;
      display: flex;
      align-items: center;
      gap: 10px;
      user-select: none;
    }
    summary::-webkit-details-marker { display: none; }
    summary::before { content: "▸"; color:#58a6ff; transition: transform .15s; }
    details[open] summary::before { transform: rotate(90deg); }
    .badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; font-weight: 600; }
    .ok { background:#23863633; color:#3fb950; }
    .warn { background:#bb800926; color:#d29922; }
    .err { background:#da363326; color:#f85149; }
    .step { color:#8b949e; font-weight: 400; font-size: 0.8rem; flex:1; text-align:right; }
    .inner { padding: 0 14px 14px; border-top: 1px solid #21262d; }
    h3 { font-size: 0.72rem; text-transform: uppercase; letter-spacing: .06em; color:#8b949e; margin: 14px 0 8px; }
    pre {
      margin: 0;
      padding: 12px;
      border-radius: 6px;
      background:#0d1117;
      border: 1px solid #30363d;
      overflow-x: auto;
      font-size: 0.8125rem;
      line-height: 1.45;
    }
    code.method { color:#79c0ff; }
    code.url { color:#a371f7; word-break: break-all; }
  </style>
</head>
<body>
  <h1>Instant Payments — demo HTTP trace</h1>
  <p class="meta">BASE_URL = ${escapeHtml(base)} · generated ${escapeHtml(new Date().toISOString())}</p>
`;

  return new Promise((resolvePromise, reject) => {
    out.write(header, "utf8");
    for (const r of htmlJournal) {
      const badgeClass = r.status >= 500 ? "err" : r.status >= 400 ? "warn" : "ok";
      const summaryLine = `<code class="method">${escapeHtml(r.method)}</code> <code class="url">${escapeHtml(r.url)}</code> <span class="badge ${badgeClass}">${r.status}</span><span class="step">${escapeHtml(r.step)}</span>`;
      const req =
        r.requestBody !== undefined
          ? `<h3>Request body</h3><pre>${escapeHtml(prettyJson(r.requestBody))}</pre>`
          : `<h3>Request body</h3><pre><em>none</em></pre>`;
      const res = `<h3>Response body</h3><pre>${escapeHtml(prettyJson(r.responseBody))}</pre>`;
      out.write(
        `<details>\n<summary>${summaryLine}</summary>\n<div class="inner">${req}${res}</div>\n</details>\n`,
        "utf8",
      );
    }
    out.write("</body>\n</html>\n", "utf8");
    out.end(() => resolvePromise(abs));
    out.on("error", reject);
  }).then((absPath) => {
    console.log(`\n${c.green("HTML report written:")} ${absPath}`);
  });
}

async function main() {
  console.log(
    `\n${c.bold("Instant Payments")} ${c.dim("— feature demo")}`,
    `\n${c.gray(`BASE_URL=${base}`)}`,
    opts.htmlOut ? `\n${c.gray(`--html=${opts.htmlOut}`)}` : "",
    opts.compact ? `\n${c.gray("(compact mode)")}` : "",
    opts.interactive ? `\n${c.gray("(interactive: pause after each exchange)")}` : "",
  );

  // --- Health ---
  banner("Liveness");
  {
    await exchange({
      step: "Health check",
      method: "GET",
      path: "/health",
      expectStatus: 200,
    });
    note("API is up.");
  }

  // --- Idempotency ---
  banner("Idempotency (TransactWriteItems + conditional idempotency put)");
  const idemKey = `idem_${runId}`;
  const createPayload = {
    idempotencyKey: idemKey,
    merchantId: "merch_demo",
    debtorAccountId: "acc_usd_1",
    creditorIban: "RO49AAAA1B31007593840000",
    creditorName: "Demo User",
    amount: 42,
    currency: "USD",
  };

  const first = await exchange({
    step: "First create (201)",
    method: "POST",
    path: "/api/v1/payments/outbound",
    body: createPayload,
    expectStatus: 201,
  });
  note(`HTTP 201 — new payment ${first.json.paymentId} (state RECEIVED).`);

  const replay = await exchange({
    step: "Idempotent replay (200)",
    method: "POST",
    path: "/api/v1/payments/outbound",
    body: createPayload,
    expectStatus: 200,
  });
  note("HTTP 200 — identical replay returns stored snapshot.");
  if (JSON.stringify(first.json) !== JSON.stringify(replay.json)) {
    throw new Error("Idempotent replay body should match first response");
  }

  const conflict = await exchange({
    step: "Same key, different payload (409)",
    method: "POST",
    path: "/api/v1/payments/outbound",
    body: { ...createPayload, amount: 99 },
    expectStatus: 409,
  });
  note(`HTTP 409 — ${conflict.json.error}.`);

  const paymentId = first.json.paymentId;

  // --- Read model ---
  banner("Read model (head + events → projection)");
  {
    const r = await exchange({
      step: "GET payment",
      method: "GET",
      path: `/api/v1/payments/outbound/${paymentId}`,
      expectStatus: 200,
    });
    note(`state=${r.json.state}, version=${r.json.version}`);
    note(`events: ${r.json.events?.length ?? 0}; first=${r.json.events?.[0]?.eventType}`);
  }

  // --- Process ---
  banner("Processing (TransactWriteItems: reserve → complete)");
  const procPayload = {
    idempotencyKey: `idem_proc_${runId}`,
    merchantId: "merch_demo",
    debtorAccountId: "acc_usd_2",
    creditorIban: "X",
    creditorName: "Y",
    amount: 50,
    currency: "USD",
  };
  const procCreate = await exchange({
    step: "Create payment to process",
    method: "POST",
    path: "/api/v1/payments/outbound",
    body: procPayload,
    expectStatus: 201,
  });
  const pidProc = procCreate.json.paymentId;

  const proc = await exchange({
    step: "POST process",
    method: "POST",
    path: `/api/v1/payments/outbound/${pidProc}/process`,
    expectStatus: 200,
  });
  note(`Result: ${prettyJson(proc.json)}`);

  const after = await exchange({
    step: "GET payment after process",
    method: "GET",
    path: `/api/v1/payments/outbound/${pidProc}`,
    expectStatus: 200,
  });
  note(`Event chain: ${(after.json.events ?? []).map((e) => e.eventType).join(" → ")}`);

  // --- Rejection ---
  banner("Rejection (INSUFFICIENT_FUNDS)");
  const bad = await exchange({
    step: "Create on zero-balance account",
    method: "POST",
    path: "/api/v1/payments/outbound",
    body: {
      idempotencyKey: `idem_rej_${runId}`,
      merchantId: "merch_demo",
      debtorAccountId: "acc_usd_5",
      creditorIban: "X",
      creditorName: "Y",
      amount: 100,
      currency: "USD",
    },
    expectStatus: 201,
  });
  const pidBad = bad.json.paymentId;
  const rej = await exchange({
    step: "POST process → reject",
    method: "POST",
    path: `/api/v1/payments/outbound/${pidBad}/process`,
    expectStatus: 200,
  });
  note(`Result: ${prettyJson(rej.json)}`);

  // --- Account ---
  banner("Account reads");
  {
    await exchange({
      step: "GET account",
      method: "GET",
      path: "/api/v1/accounts/acc_usd_1",
      expectStatus: 200,
    });
    await exchange({
      step: "GET missing account",
      method: "GET",
      path: "/api/v1/accounts/acc_no_such_account",
      expectStatus: 404,
    });
    note("404 ACCOUNT_NOT_FOUND for unknown id.");
  }

  // --- BatchGet ---
  banner("BatchGetItem reservations");
  {
    await exchange({
      step: "Empty reservationIds (400)",
      method: "POST",
      path: "/api/v1/accounts/acc_usd_1/batch-get-reservations",
      body: { reservationIds: [] },
      expectStatus: 400,
    });
    await exchange({
      step: "Partial batch (200 + missing)",
      method: "POST",
      path: "/api/v1/accounts/acc_usd_1/batch-get-reservations",
      body: { reservationIds: [`res_fake_${runId}`] },
      expectStatus: 200,
    });
  }

  // --- Merchant GSI ---
  banner("Global secondary indexes");
  const merchId = `merch_page_${runId}`;
  for (let i = 0; i < 3; i++) {
    await exchange({
      step: `Seed merchant payment ${i + 1}/3`,
      method: "POST",
      path: "/api/v1/payments/outbound",
      body: {
        idempotencyKey: `${idemKey}_page_${i}`,
        merchantId: merchId,
        debtorAccountId: "acc_usd_1",
        creditorIban: "X",
        creditorName: "Y",
        amount: 1,
        currency: "USD",
      },
      expectStatus: 201,
    });
  }

  const page1 = await exchange({
    step: "Query GSI_MERCHANT_PAYMENTS (page 1)",
    method: "GET",
    path: `/api/v1/merchants/${merchId}/payments?limit=2`,
    expectStatus: 200,
  });
  note(`items=${page1.json.items?.length ?? 0}, nextToken=${Boolean(page1.json.nextToken)}`);

  if (page1.json.nextToken) {
    const enc = encodeURIComponent(page1.json.nextToken);
    await exchange({
      step: "Query GSI_MERCHANT_PAYMENTS (page 2)",
      method: "GET",
      path: `/api/v1/merchants/${merchId}/payments?limit=2&nextToken=${enc}`,
      expectStatus: 200,
    });
  }

  await exchange({
    step: "Query GSI_MERCHANT_STATE_PAYMENTS",
    method: "GET",
    path: `/api/v1/merchants/${merchId}/payments/state/RECEIVED?limit=5`,
    expectStatus: 200,
  });

  if (page1.json.nextToken) {
    await exchange({
      step: "Wrong GSI for pagination token (400)",
      method: "GET",
      path: `/api/v1/merchants/${merchId}/payments/state/RECEIVED?limit=2&nextToken=${encodeURIComponent(page1.json.nextToken)}`,
      expectStatus: 400,
    });
    note(`INVALID_PAGINATION_TOKEN when token from another index.`);
  } else {
    note("(skipped wrong-token check: no nextToken)");
  }

  banner("Done");
  note("All demo steps completed.");
  console.log("");

  if (opts.htmlOut) {
    await writeHtmlReport(opts.htmlOut);
  }
}

main().catch((err) => {
  const msg = String(err?.message ?? err);
  console.error(`\n${c.red("Demo failed:")} ${msg}`);
  if (/fetch failed|ECONNREFUSED/i.test(msg)) {
    console.error(c.dim("  (Start API: docker compose --profile app up  or  ./scripts/run-app-local.sh)"));
  }
  process.exit(1);
});
