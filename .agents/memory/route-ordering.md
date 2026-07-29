---
name: Express route ordering
description: Specific routes must be mounted before wildcard/param routes of the same prefix to avoid being swallowed.
---

# Express route ordering

Any route with a fixed segment that shares a prefix with a `/:id` wildcard must be mounted **before** that wildcard router.

**Why:** Express matches routes in registration order. `/trades/feed` will be caught by `GET /trades/:id` (with `id = "feed"`) and return 400 unless `tradeFeedRouter` is registered before `tradesRouter`.

**How to apply:** In `artifacts/api-server/src/routes/index.ts`, always place specific-path routers (e.g. `tradeFeedRouter`) before their param-based siblings (e.g. `tradesRouter`). Same rule applies to any future `/listings/featured`, `/users/me`, etc. if those prefixes already have `/:id` routes.
