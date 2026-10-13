/**
 * Profile photo resolution + auth persist without blobs.
 * Run: npx tsx tests/avatar-photo-sync.test.ts
 */
import assert from "node:assert/strict";
import { resolveAvatarPhotoUrl } from "../src/lib/avatarPhoto.ts";
import { partializeAuthState } from "../src/store/authStore.ts";

assert.equal(
  resolveAvatarPhotoUrl({
    userId: "u1",
    photoUrl: "old-prop",
    sessionUserId: "u1",
    sessionPhotoUrl: "new-session",
  }),
  "new-session",
  "self prefers session photo"
);

assert.equal(
  resolveAvatarPhotoUrl({
    userId: "u1",
    photoUrl: "stale-list-photo",
    sessionUserId: "u1",
    sessionPhotoUrl: null,
  }),
  null,
  "self cleared photo does not fall back to stale list prop"
);

assert.equal(
  resolveAvatarPhotoUrl({
    userId: "other",
    photoUrl: "their-photo",
    sessionUserId: "u1",
    sessionPhotoUrl: "my-photo",
  }),
  "their-photo",
  "other users keep prop photo"
);

const persisted = partializeAuthState({
  user: {
    id: "u1",
    email: "a@b.c",
    name: "Ada",
    role: "TEACHER",
    photoUrl: "data:image/jpeg;base64,AAAA",
    signatureUrl: "data:image/png;base64,BBBB",
  },
  school: null,
  accessToken: "tok",
  capabilities: ["nav.dashboard"],
  impersonation: null,
  setAuth: () => {},
  updateUser: () => {},
  setCapabilities: () => {},
  setSchool: () => {},
  beginImpersonation: () => {},
  endImpersonation: () => {},
  logout: () => {},
} as any);

assert.equal(persisted.accessToken, "tok");
assert.ok(persisted.user);
assert.equal((persisted.user as any).photoUrl, undefined);
assert.equal((persisted.user as any).signatureUrl, undefined);
assert.equal((persisted.user as any).name, "Ada");

console.log("avatar-photo-sync.test.ts: ok");
