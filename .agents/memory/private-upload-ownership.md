---
name: Private upload ownership
description: Private object paths are owner-scoped and must be validated before database references are accepted.
---

New private uploads live under an authenticated user-owned path. Listing and KYC write endpoints must reject a newly supplied object path unless it belongs to that user.

**Why:** Authorizing reads from an untrusted database URL alone lets a user attach someone else's known object path and change who can read it.

**How to apply:** Keep ownership validation on every endpoint that stores private object paths; public listing-image reads are safe only after this validation.