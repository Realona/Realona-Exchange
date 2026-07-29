---
name: Wishlist architecture
description: How the wishlist system is structured — table, routes, public share URL, price-drop hook.
---

# Wishlist system

## Table
`wishlist_items (id, user_id, listing_id, created_at)` with UNIQUE(user_id, listing_id).
Schema: `lib/db/src/schema/wishlist.ts`.

## Routes (all in `artifacts/api-server/src/routes/wishlist.ts`)
- `GET /api/wishlist` — authenticated; returns current user's saved listings
- `POST /api/wishlist/:listingId` — add; 409 if already saved
- `DELETE /api/wishlist/:listingId` — remove
- `GET /api/wishlist/public/:username` — unauthenticated; returns any user's wishlist by username

**Why:** The public route must be registered BEFORE the `/:listingId` routes in Express so "public" isn't treated as a listingId.

## Frontend URLs
- `/wishlist` → authenticated personal wishlist (WishlistPage)
- `/wishlist/:username` → public view (PublicWishlistPage) — no auth required
- Share button on WishlistPage copies `${origin}/wishlist/${user.username}` to clipboard.

## Price-drop notifications
Triggered in `PATCH /listings/:id` in `artifacts/api-server/src/routes/listings.ts`.
When `newPrice < oldPrice`, all wishlist users (except the seller) get a `trade_update` notification.

## Sale notifications
Triggered at both trade completion points in `artifacts/api-server/src/routes/trades.ts`:
- `POST /trades/:id/confirm-receipt` (line ~300)
- `POST /trades/:id/confirm-access` (line ~454)
