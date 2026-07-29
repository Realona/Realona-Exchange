---
name: Admin pages pattern
description: How to add a new admin section — four touch points required.
---

# Admin pages pattern

Adding a new admin section requires four touch points:

1. **Create** `artifacts/realona/src/pages/admin/<name>.tsx` — import `AdminNav` from `./users` and use `<AdminNav />` at the top of `<Layout>`.
2. **Update `AdminNav`** in `artifacts/realona/src/pages/admin/users.tsx` — add `{ href: "/admin/<name>", label: "Label" }` to `navLinks`. This nav is used by all non-overview admin pages.
3. **Update nav in `index.tsx`** (`artifacts/realona/src/pages/admin/index.tsx`) — same addition to the `navLinks` array there (overview page has its own copy).
4. **Register route** in `artifacts/realona/src/App.tsx` — import the component and add `<Route path="/admin/<name>"><AdminRoute component={Admin<Name>} /></Route>`.

**Why:** The admin nav is duplicated between `users.tsx` (used by all sub-pages via `AdminNav` export) and `index.tsx` (the overview page renders its own nav inline). Forgetting either causes the tab to appear only on some pages.
