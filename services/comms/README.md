# Communications & Documents

**Owns:** `Announcement`, `SchoolDocument`.

**Replaces:** `announcementController`, `documentController`.

**Notes:** Natural home for email (`nodemailer`), push (`firebase-admin`), and S3 document storage. Primary consumer of domain events (§5). Second extraction candidate (Phase 4).

**Status:** Scaffold only. Logic remains in the monolith.
