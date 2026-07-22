export type CourseContentType = 'video' | 'pdf';

export interface CourseView {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  contentUrl: string;
  contentType: CourseContentType;
  originalFileName?: string;
  creatorId: number;
  creatorName: string;
  createdAt: Date;
  isWatched: boolean;
  progressPercentage: number;
  lastPositionSeconds: number;
  firstAccessedAt: Date | null;
  lastAccessedAt: Date | null;
  assignedUserIds: number[];
  assignedDepartments: string[];
}

export interface CourseTracking {
  courseId: number;
  courseTitle: string;
  contentType: CourseContentType;
  userId: number;
  userName: string;
  department?: string;
  isWatched: boolean;
  watchedAt: Date | null;
  progressPercentage: number;
  lastPositionSeconds: number;
  totalDurationSeconds: number;
  currentPage: number;
  totalPages: number;
  timeSpentSeconds: number;
  firstAccessedAt: Date | null;
  lastAccessedAt: Date | null;
}

export interface CourseCreation {
  title: string;
  description: string;
  videoUrl: string;
  contentType: CourseContentType;
  creatorId: number;
  assignedUserIds: number[];
  assignedDepartments: string[];
}

export interface CourseProgress {
  courseId: number;
  progressPercentage: number;
  positionSeconds?: number;
  durationSeconds?: number;
  currentPage?: number;
  totalPages?: number;
  activitySeconds?: number;
  completed?: boolean;
}
