export interface CourseView {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  creatorId: string;
  creatorName: string;
  createdAt: Date;
  isWatched: boolean;
}

export interface CourseTracking {
  courseId: number;
  courseTitle: string;
  userId: number;
  userName: string;
  isWatched: boolean;
  watchedAt: Date | null;
}

export interface CourseCreation {
  title: string;
  description: string;
  videoUrl: string;
  creatorId: number;
  assignedUserIds: number[];
}
