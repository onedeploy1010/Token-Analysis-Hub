import SchemaBuilder from "@pothos/core";

/**
 * Single Pothos builder instance. `Context` can grow later (request id,
 * authed admin, dataloader batch); for now it's the raw Express req/res.
 */
export interface GraphQLContext {
  reqId?: string;
}

export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  Scalars: {
    // Lower-case 0x… addresses. Validated on input, returned as-is.
    Address: { Input: string; Output: string };
    // Stringified uint256 for 18-decimal amounts.
    BigIntString: { Input: string; Output: string };
    // ISO-8601 datetime string.
    DateTime: { Input: Date; Output: Date };
  };
}>({});

builder.queryType({});

// ── Scalars ──────────────────────────────────────────────────────────────
builder.scalarType("Address", {
  serialize: (value) => String(value).toLowerCase(),
  parseValue: (value) => {
    if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
      throw new Error("Address must be 0x followed by 40 hex chars");
    }
    return value.toLowerCase();
  },
});

builder.scalarType("BigIntString", {
  serialize: (value) => String(value),
  parseValue: (value) => {
    if (typeof value !== "string" || !/^\d+$/.test(value)) {
      throw new Error("BigIntString must be a decimal string");
    }
    return value;
  },
});

builder.scalarType("DateTime", {
  serialize: (value) => (value instanceof Date ? value.toISOString() : String(value)),
  parseValue: (value) => {
    const d = new Date(String(value));
    if (isNaN(d.getTime())) throw new Error("Invalid DateTime");
    return d;
  },
});
