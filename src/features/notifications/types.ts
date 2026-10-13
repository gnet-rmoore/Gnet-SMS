export type InAppNotification = {
  id: string;
  schoolId: string;
  userId: string;
  eventKey: string;
  title: string;
  body: string;
  href?: string | null;
  meta?: string | null;
  readAt?: string | null;
  createdAt: string;
};
