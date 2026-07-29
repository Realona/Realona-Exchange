---
name: OpenAPI yaml merge risk
description: Task agent merges can overwrite openapi.yaml additions; always re-add and re-run codegen after a merge.
---

# OpenAPI yaml merge risk

When a task agent merges its branch, it may overwrite sections of `lib/api-spec/openapi.yaml` that the main agent added (and vice versa). The generated client files in `lib/api-client-react/src/generated/` reflect only whatever was in the yaml at the time `pnpm run codegen` last ran.

**Symptoms:** `useGetSomething` TypeScript errors on hooks that exist in the generated `api.ts` but disappear after codegen, OR hooks that simply vanish after a merge.

**How to apply:**
- After any task agent merge, grep the yaml for your recently-added operationIds to confirm they survived.
- If any are missing, re-add the path + schema entries and re-run: `cd lib/api-spec && pnpm run codegen`.
- Also check the reverse: the task agent's new endpoints may not be in the generated client if you ran codegen before their merge — same fix.
- Codegen is idempotent and safe to re-run at any time.
