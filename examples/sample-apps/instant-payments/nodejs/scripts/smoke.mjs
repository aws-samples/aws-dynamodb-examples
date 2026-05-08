const base = process.env.BASE_URL ?? "http://localhost:8080";

async function main() {
  await mustOk(`${base}/health`);

  const create = await mustJson(`${base}/api/v1/payments/outbound`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      idempotencyKey: `smoke_${Date.now()}`,
      merchantId: "merch_smoke",
      debtorAccountId: "acc_usd_1",
      creditorIban: "IBAN",
      creditorName: "Smoke",
      amount: 1,
      currency: "USD",
    }),
  });

  await mustJson(`${base}/api/v1/payments/outbound/${create.paymentId}`);
  await mustJson(`${base}/api/v1/payments/outbound/${create.paymentId}/process`, { method: "POST" });
  await mustJson(`${base}/api/v1/accounts/acc_usd_1`);
  await mustJson(`${base}/api/v1/merchants/merch_smoke/payments`);

  console.log("smoke ok");
}

async function mustOk(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Expected 2xx for ${url}, got ${res.status}`);
}

async function mustJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`Expected 2xx for ${url}, got ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

await main();

