import type { QueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { USER_PHOTO_QUERY_ROOTS } from "./avatarPhoto";

export async function persistUserPhoto(
  userId: string,
  photoUrl: string | null
): Promise<string | null> {
  const updated = await api.patch(`/api/users/${userId}`, { photoUrl });
  return (updated as { photoUrl?: string | null }).photoUrl ?? photoUrl;
}

export function invalidateUserPhotoQueries(queryClient: QueryClient) {
  for (const root of USER_PHOTO_QUERY_ROOTS) {
    void queryClient.invalidateQueries({ queryKey: [root] });
  }
}

export function canStaffEditStudentPhoto(role?: string | null): boolean {
  return ["REGISTRAR", "SCHOOL_ADMIN", "SUPER_ADMIN", "PRINCIPAL"].includes(
    role || ""
  );
}
