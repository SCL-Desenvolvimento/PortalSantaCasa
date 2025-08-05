import { Feedback } from "./feedback.model";

export interface Stats {
  newsCount: number;
  documentsCount: number;
  birthdaysCount: number;
  usersCount: number;
  recentFeedbacks: Feedback[];
}
