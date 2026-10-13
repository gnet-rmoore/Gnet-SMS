export type AuthorRef = {
  id: string;
  name: string;
  email?: string;
  photoUrl?: string | null;
};

export type ClassroomTopic = {
  id: string;
  classroomId: string;
  title: string;
  order: number;
};

export type PostAttachment = {
  id: string;
  postId: string;
  fileUrl: string;
  fileType: string;
};

export type PostComment = {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  parentCommentId?: string | null;
  createdAt: string;
  author?: AuthorRef;
};

export type ClassroomSummary = {
  id: string;
  name: string;
  classCode?: string;
  bannerColor?: string | null;
  bannerImageUrl?: string | null;
  subjectId?: string | null;
  gradeLevelId?: string | null;
  ownerTeacherId?: string;
  subject?: { id: string; name: string } | null;
  gradeLevel?: { id: string; name: string } | null;
  ownerTeacher?: AuthorRef | null;
  members?: Array<{ userId: string; role: string; user?: AuthorRef | null }>;
  _count?: { members?: number; posts?: number };
};

export type ClassroomPost = {
  id: string;
  classroomId: string;
  authorId: string;
  type: "ANNOUNCEMENT" | "ASSIGNMENT" | "MATERIAL" | string;
  title?: string | null;
  body: string;
  topicId?: string | null;
  topic?: ClassroomTopic | null;
  maxPoints?: number | null;
  dueAt?: string | null;
  createdAt: string;
  author?: AuthorRef;
  attachments?: PostAttachment[];
  _count?: { comments?: number; submissions?: number };
};

export type Submission = {
  id: string;
  postId: string;
  studentId: string;
  textResponse?: string | null;
  status: string;
  submittedAt?: string | null;
  grade?: number | null;
  feedback?: string | null;
  returnedAt?: string | null;
  student?: AuthorRef;
  attachments?: Array<{ id: string; fileUrl: string }>;
};

export type PostDetail = ClassroomPost & {
  mySubmission?: Submission | null;
  submissions?: Submission[];
  comments?: PostComment[];
  membershipRole?: string | null;
  viewingAsStudentId?: string | null;
};

export type MemberRow = {
  id: string;
  userId: string;
  role: string;
  user?: AuthorRef & { role?: string };
};

export type MarksPayload = {
  students: Array<{ id: string; name: string; email?: string; photoUrl?: string | null }>;
  assignments: Array<{
    id: string;
    title?: string | null;
    maxPoints?: number | null;
    dueAt?: string | null;
    submissions: Array<{
      id?: string;
      studentId: string;
      grade?: number | null;
      status: string;
      feedback?: string | null;
    }>;
  }>;
};

export type RoomTab = "STREAM" | "CLASSWORK" | "PEOPLE" | "MARKS";
