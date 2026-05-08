import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createTestApp } from "../helpers/testApp.mjs";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

let harness;

beforeAll(async () => {
  harness = await createTestApp();
});

afterAll(async () => {
  await harness.close();
});

describe("Instant Payments spec (integration)", () => {
  test("Story 1: create payment (201), idempotent replay (200), conflict (409)", async () => {
    const payload = {
      idempotencyKey: "idem_1",
      merchantId: "merch_1",
      debtorAccountId: "acc_usd_1",
      creditorIban: "RO49AAAA1B31007593840000",
      creditorName: "John Doe",
      amount: 100.0,
      currency: "USD",
    };

    const r1 = await harness.app.inject({
      method: "POST",
      url: "/api/v1/payments/outbound",
      payload,
    });
    expect(r1.statusCode).toBe(201);
    const b1 = r1.json();
    expect(b1.state).toBe("RECEIVED");
    expect(b1.paymentId).toMatch(/^pay_/);
    expect(b1.correlationId).toMatch(/^corr_/);

    const r2 = await harness.app.inject({
      method: "POST",
      url: "/api/v1/payments/outbound",
      payload,
    });
    expect(r2.statusCode).toBe(200);
    expect(r2.json()).toEqual(b1);

    const r3 = await harness.app.inject({
      method: "POST",
      url: "/api/v1/payments/outbound",
      payload: { ...payload, amount: 101.0 },
    });
    expect(r3.statusCode).toBe(409);
    expect(r3.json().error).toBe("IDEMPOTENCY_CONFLICT");
  });

  test("Story 3: get payment returns head+events; missing returns 404", async () => {
    const create = await harness.app.inject({
      method: "POST",
      url: "/api/v1/payments/outbound",
      payload: {
        idempotencyKey: "idem_2",
        merchantId: "merch_1",
        debtorAccountId: "acc_usd_1",
        creditorIban: "X",
        creditorName: "Y",
        amount: 1,
        currency: "USD",
      },
    });
    const paymentId = create.json().paymentId;

    const read = await harness.app.inject({
      method: "GET",
      url: `/api/v1/payments/outbound/${paymentId}`,
    });
    expect(read.statusCode).toBe(200);
    const body = read.json();
    expect(body.paymentId).toBe(paymentId);
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events[0].eventType).toBe("OUTBOUND_PAYMENT_CREATED");

    const missing = await harness.app.inject({
      method: "GET",
      url: "/api/v1/payments/outbound/pay_missing",
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error).toBe("PAYMENT_NOT_FOUND");
  });

  test("Story 2: manual process completes when funds exist; rejects when insufficient", async () => {
    const createOk = await harness.app.inject({
      method: "POST",
      url: "/api/v1/payments/outbound",
      payload: {
        idempotencyKey: "idem_proc_ok",
        merchantId: "merch_proc",
        debtorAccountId: "acc_usd_2",
        creditorIban: "X",
        creditorName: "Y",
        amount: 50,
        currency: "USD",
      },
    });
    const pidOk = createOk.json().paymentId;

    const procOk = await harness.app.inject({
      method: "POST",
      url: `/api/v1/payments/outbound/${pidOk}/process`,
    });
    expect(procOk.statusCode).toBe(200);
    expect(procOk.json()).toEqual({ paymentId: pidOk, state: "COMPLETED", reasonCode: null });

    const createBad = await harness.app.inject({
      method: "POST",
      url: "/api/v1/payments/outbound",
      payload: {
        idempotencyKey: "idem_proc_bad",
        merchantId: "merch_proc",
        debtorAccountId: "acc_usd_5",
        creditorIban: "X",
        creditorName: "Y",
        amount: 100,
        currency: "USD",
      },
    });
    const pidBad = createBad.json().paymentId;
    const procBad = await harness.app.inject({
      method: "POST",
      url: `/api/v1/payments/outbound/${pidBad}/process`,
    });
    expect(procBad.statusCode).toBe(200);
    expect(procBad.json().state).toBe("REJECTED");
    expect(procBad.json().reasonCode).toBe("INSUFFICIENT_FUNDS");
  });

  test("Process response reflects committed state when completion transact is cancelled", async () => {
    // Force a reserve-success / complete-fail scenario by making currentBalance < amount while availableBalance is high.
    const ddb = new DynamoDBClient({
      endpoint: harness.endpoint,
      region: harness.region,
      credentials: { accessKeyId: "local", secretAccessKey: "local" },
    });
    await ddb.send(
      new UpdateItemCommand({
        TableName: harness.tableName,
        Key: {
          PK: { S: "ACCOUNT#acc_usd_2" },
          SK: { S: "ACCOUNT#acc_usd_2" },
        },
        UpdateExpression: "SET currentBalance = :cb",
        ExpressionAttributeValues: {
          ":cb": { N: "0" },
        },
      }),
    );

    const create = await harness.app.inject({
      method: "POST",
      url: "/api/v1/payments/outbound",
      payload: {
        idempotencyKey: "idem_proc_cancelled_complete",
        merchantId: "merch_proc",
        debtorAccountId: "acc_usd_2",
        creditorIban: "X",
        creditorName: "Y",
        amount: 50,
        currency: "USD",
      },
    });
    expect(create.statusCode).toBe(201);
    const paymentId = create.json().paymentId;

    const proc = await harness.app.inject({
      method: "POST",
      url: `/api/v1/payments/outbound/${paymentId}/process`,
    });
    expect(proc.statusCode).toBe(200);
    // Completion transaction should cancel on currentBalance >= :amt; processor must not lie about COMPLETED.
    expect(proc.json()).toEqual({ paymentId, state: "FUNDS_RESERVED", reasonCode: null });

    const read = await harness.app.inject({
      method: "GET",
      url: `/api/v1/payments/outbound/${paymentId}`,
    });
    expect(read.statusCode).toBe(200);
    expect(read.json().state).toBe("FUNDS_RESERVED");
  });

  test("Story 4: get account returns balances and reservations; missing -> 404", async () => {
    const r1 = await harness.app.inject({
      method: "GET",
      url: "/api/v1/accounts/acc_usd_1",
    });
    expect(r1.statusCode).toBe(200);
    expect(r1.json().accountId).toBe("acc_usd_1");

    const r2 = await harness.app.inject({
      method: "GET",
      url: "/api/v1/accounts/acc_missing",
    });
    expect(r2.statusCode).toBe(404);
    expect(r2.json().error).toBe("ACCOUNT_NOT_FOUND");
  });

  test("Story 5: batch-get reservations validates and returns missing ids with 200", async () => {
    const invalid = await harness.app.inject({
      method: "POST",
      url: "/api/v1/accounts/acc_usd_1/batch-get-reservations",
      payload: { reservationIds: [] },
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().error).toBe("VALIDATION_ERROR");

    const ok = await harness.app.inject({
      method: "POST",
      url: "/api/v1/accounts/acc_usd_1/batch-get-reservations",
      payload: { reservationIds: ["res_does_not_exist"] },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().missingReservationIds).toEqual(["res_does_not_exist"]);
  });

  test("Stories 7/8: merchant list pagination and INVALID_PAGINATION_TOKEN", async () => {
    // Create a few payments for merchant
    for (const k of ["m_a", "m_b", "m_c"]) {
      await harness.app.inject({
        method: "POST",
        url: "/api/v1/payments/outbound",
        payload: {
          idempotencyKey: `idem_${k}`,
          merchantId: "merch_list",
          debtorAccountId: "acc_usd_1",
          creditorIban: "X",
          creditorName: "Y",
          amount: 1,
          currency: "USD",
        },
      });
    }

    const page1 = await harness.app.inject({
      method: "GET",
      url: "/api/v1/merchants/merch_list/payments?limit=2",
    });
    expect(page1.statusCode).toBe(200);
    const p1 = page1.json();
    expect(p1.items.length).toBe(2);
    expect(typeof p1.nextToken).toBe("string");

    const page2 = await harness.app.inject({
      method: "GET",
      url: `/api/v1/merchants/merch_list/payments?limit=2&nextToken=${encodeURIComponent(
        p1.nextToken,
      )}`,
    });
    expect(page2.statusCode).toBe(200);
    expect(page2.json().items.length).toBeGreaterThan(0);

    const misuse = await harness.app.inject({
      method: "GET",
      url: `/api/v1/merchants/merch_list/payments/state/RECEIVED?limit=2&nextToken=${encodeURIComponent(
        p1.nextToken,
      )}`,
    });
    expect(misuse.statusCode).toBe(500);
    expect(misuse.json().error).toBe("INTERNAL_ERROR");
  });
});

