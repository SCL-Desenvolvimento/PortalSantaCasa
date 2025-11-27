export interface CourseTracking {
  courseId: number;
  courseTitle: string;
  userId: number;
  userName: string;
  isWatched: boolean;
  watchedAt: Date | null;
}
