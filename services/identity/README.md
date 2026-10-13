# Identity & Platform

**Owns:** `User`, `ParentStudent`, `School`, `SystemLog`, `SystemCredential`.

**Replaces:** `authController`, `userController`, `schoolController`, `superAdminController`.

**Notes:** Mints JWT access and Super Admin tokens. Owns the tenant (`School`) directory. Extracted last (Phase 5) — every other service depends on it.

**Status:** Scaffold only. Logic remains in the monolith.
