---
name: Notification types
description: NotificationType union in notifier.ts must be updated manually; it is not derived from DB or codegen.
---

# Notification type registry

The `type NotificationType` union in `artifacts/api-server/src/lib/notifier.ts` is hand-maintained. Adding a new notification call anywhere without updating this union causes a TypeScript compile error (TS2345).

**Why:** The type is explicit to prevent typos in notification categories, but it's not auto-generated — it must be kept in sync by hand.

**How to apply:** Before calling `createNotification(userId, "new_type", ...)`, add `| "new_type"` to the union in `notifier.ts`. The typecheck CI will catch omissions.

Current types as of last edit: trade_update, new_message, deposit_confirmed, withdrawal_approved, withdrawal_rejected, offer_received, offer_responded, trade_rated, announcement, giveaway, deposit_pending.
