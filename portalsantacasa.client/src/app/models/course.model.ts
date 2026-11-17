export type CourseContentType = 'video' | 'pdf';

export interface CourseTrainingSchedule {
  trackName?: string | null;
  deadlineDays?: number | null;
  reminderDaysBefore?: number | null;
  renewalDays?: number | null;
}

export interface CourseView extends CourseTrainingSchedule {
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
  explicitAssignedUserIds?: number[] | null;
  assignedDepartments: string[];
  cycleId?: string | null;
  dueAt?: string | null;
  renewalAt?: string | null;
  isOverdue?: boolean;
  isRecertification?: boolean;
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
  trackName?: string | null;
  assignedAt?: string | null;
  dueAt?: string | null;
  renewalAt?: string | null;
  isOverdue?: boolean;
  completionHistory?: CourseCompletion[];
}

export interface CourseCompletion {
  assignedAt: string | null;
  dueAt: string | null;
  completedAt: string;
  timeSpentSeconds: number;
}

export interface CourseCreation extends CourseTrainingSchedule {
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
  cycleId?: string | null;
  progressPercentage: number;
  positionSeconds?: number;
  durationSeconds?: number;
  currentPage?: number;
  totalPages?: number;
  activitySeconds?: number;
  completed?: boolean;
}
