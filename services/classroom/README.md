# Classroom & Collaboration

**Owns:** `Classroom`, `ClassroomMember`, posts/comments/attachments, submissions, topics, meetings.

**Replaces:** `classroomController`.

**Notes:** Owns the Socket.IO real-time gateway. Requires a Redis adapter before multi-replica scaling.

**Status:** Scaffold only. Logic remains in the monolith.
