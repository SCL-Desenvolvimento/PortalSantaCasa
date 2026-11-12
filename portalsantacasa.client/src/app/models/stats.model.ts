import { Feedback } from "./feedback.model";

export interface Stats {
  newsCount: number;
  documentsCount: number;
  birthdaysCount: number | null;
  usersCount: number;
  newsTrend: number | null;
  documentsTrend: number | null;
  birthdaysTrend: number | null;
  usersTrend: number | null;
  recentFeedbacks: Feedback[];
}
