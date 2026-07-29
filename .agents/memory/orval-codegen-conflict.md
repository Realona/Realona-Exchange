---
name: Orval codegen conflict
description: Inline requestBody schemas generate duplicate TS type + zod schema with same name, causing TS2308 on re-export.
---

When an OpenAPI endpoint uses an inline `requestBody` schema (not a `$ref`), orval generates:
1. A zod schema named `{OperationId}Body` in `api.ts`
2. A TypeScript interface named `{OperationId}Body` in `types/{operationId}Body.ts`

Both get re-exported from `lib/api-zod/src/index.ts`, producing TS2308 ambiguity.

**Why:** Orval v8 creates a types/ file for inline body schemas but also bakes the zod schema into api.ts under the same name.

**How to apply:** Always define request body schemas as named components (`$ref: "#/components/schemas/MyBodyName"`) in the OpenAPI spec. Never define them inline. This causes orval to use the schema name for the types file, avoiding the Body suffix clash.
