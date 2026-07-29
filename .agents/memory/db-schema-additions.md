---
name: DB schema additions via raw SQL
description: Columns added via psql ALTER TABLE must also be added to the Drizzle schema file or the ORM won't select them.
---

# DB schema / Drizzle sync rule

New columns added with `psql "$DATABASE_URL" -c "ALTER TABLE ... ADD COLUMN IF NOT EXISTS ..."` are live in the DB immediately, but Drizzle ORM only knows about columns declared in `lib/db/src/schema/*.ts`.

**Why:** Drizzle does not introspect the DB at runtime — it uses the TypeScript schema as the source of truth for queries and types.

**How to apply:** After every raw ALTER TABLE, open the corresponding schema file and add the column definition. Run `tsc --build` to verify the types are consistent.

## Columns added this way on Realona Exchange
- `listings.highlighted_players TEXT` → `highlightedPlayers: text("highlighted_players")` in `listings.ts`
- `listings.category`, `platform`, `account_handle`, `follower_count`, `following`, `account_age`, `engagement_rate`, `view_count`, `konami_id`, `konami_password`, `access_code` — all added via raw SQL + schema file
- `users.is_verified`, `kyc_level`, `referral_code`, `referred_by` — same pattern
- `trades.agreed_amount`, `access_confirmed` — same pattern
