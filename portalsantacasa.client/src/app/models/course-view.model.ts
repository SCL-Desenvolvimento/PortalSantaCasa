export interface CourseView {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  creatorName: string;
  createdAt: Date;
  isWatched: boolean;
}
