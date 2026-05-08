/**
 * Payment aggregate — lifecycle state derived from the event stream and the stream head row.
 * Pure domain: no AWS / Fastify imports.
 */
export class Payment {
  /**
   * @param {object} props
   * @param {string} props.paymentId
   * @param {number} props.version - lastSequence / stream version
   * @param {string} props.state - RECEIVED | FUNDS_RESERVED | COMPLETED | REJECTED
   * @param {string | null} props.reasonCode
   * @param {string} props.debtorAccountId
   * @param {number} props.amount
   * @param {string} props.createdAtUtc
   * @param {string} props.correlationId
   */
  constructor({ paymentId, version, state, reasonCode, debtorAccountId, amount, createdAtUtc, correlationId }) {
    this.paymentId = paymentId;
    this.version = version;
    this.state = state;
    this.reasonCode = reasonCode;
    this.debtorAccountId = debtorAccountId;
    this.amount = amount;
    this.createdAtUtc = createdAtUtc;
    this.correlationId = correlationId;
  }

  /**
   * Build projection from persisted head + ordered EVENT# rows; validates head vs replayed lifecycle.
   *
   * @param {object} head - PAYMENT_STREAM_HEAD DynamoDB item shape (already plain JS)
   * @param {object[]} sortedEvents - EVENT# items, sorted by SK ascending
   */
  static fromHeadAndEvents(head, sortedEvents) {
    if (sortedEvents.length === 0) {
      throw new Error("Inconsistent payment partition: missing events");
    }

    const lastEventSeq = sortedEvents.at(-1)?.sequenceNumber;
    if (head.lastSequence !== lastEventSeq) {
      throw new Error("Inconsistent payment partition: head sequence mismatch");
    }

    const projection = Payment.#projectFromEvents(head.paymentId, head, sortedEvents);

    if (head.aggregateState !== projection.state) {
      throw new Error("Inconsistent payment partition: head mismatch");
    }

    return new Payment(projection);
  }

  /**
   * Read-model helper: fold events to lifecycle state only (API consistency check).
   *
   * @param {object[]} events - payment events in any order (sorted internally)
   */
  static replayLifecycleState(events) {
    const sorted = [...events].sort((a, b) => (a.SK < b.SK ? -1 : 1));
    return Payment.#deriveStateOnly(sorted);
  }

  static isTerminalState(state) {
    return state === "COMPLETED" || state === "REJECTED";
  }

  get terminal() {
    return Payment.isTerminalState(this.state);
  }

  /**
   * @param {object} head
   * @param {object[]} sortedEvents
   */
  static #projectFromEvents(paymentId, head, sortedEvents) {
    let state = "RECEIVED";
    let reasonCode = null;
    for (const e of sortedEvents) {
      switch (e.eventType) {
        case "OUTBOUND_PAYMENT_CREATED":
          state = "RECEIVED";
          reasonCode = null;
          break;
        case "FUNDS_RESERVED":
          state = "FUNDS_RESERVED";
          reasonCode = null;
          break;
        case "COMPLETED":
          state = "COMPLETED";
          reasonCode = null;
          break;
        case "REJECTED":
          state = "REJECTED";
          reasonCode = e.reasonCode ?? null;
          break;
        default:
          break;
      }
    }

    return {
      paymentId,
      version: head.lastSequence,
      state,
      reasonCode,
      debtorAccountId: head.debtorAccountId,
      amount: head.amount,
      createdAtUtc: head.createdAtUtc,
      correlationId: head.correlationId,
    };
  }

  static #deriveStateOnly(sortedEvents) {
    let state = "RECEIVED";
    for (const e of sortedEvents) {
      switch (e.eventType) {
        case "OUTBOUND_PAYMENT_CREATED":
          state = "RECEIVED";
          break;
        case "FUNDS_RESERVED":
          state = "FUNDS_RESERVED";
          break;
        case "COMPLETED":
          state = "COMPLETED";
          break;
        case "REJECTED":
          state = "REJECTED";
          break;
        default:
          break;
      }
    }
    return state;
  }
}
