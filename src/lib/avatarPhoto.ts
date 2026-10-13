/**
 * Resolve which photo URL an avatar should show.
 * For the signed-in user, session photo always wins (including explicit null after remove).
 */
export function resolveAvatarPhotoUrl(opts: {
  userId?: string | null;
  photoUrl?: string | null;
  sessionUserId?: string | null;
  sessionPhotoUrl?: string | null;
  preferSessionPhoto?: boolean;
}): string | null {
  const {
    userId,
    photoUrl,
    sessionUserId,
    sessionPhotoUrl,
    preferSessionPhoto = true,
  } = opts;

  const isSelf = Boolean(userId && sessionUserId && userId === sessionUserId);
  if (preferSessionPhoto && isSelf) {
    return sessionPhotoUrl || null;
  }
  return photoUrl || null;
}

/** React Query roots that often embed user photoUrl snapshots. */
export const USER_PHOTO_QUERY_ROOTS = [
  "classrooms",
  "students",
  "registrar",
  "attendance",
  "curriculum",
  "dashboard",
  "student-records",
  "staff-portal",
  "leave-approval",
  "work-orders",
  "payroll",
  "classroom-workspace",
  "fees",
  "maintenance",
  "exam-details",
  "gradebook",
] as const;
