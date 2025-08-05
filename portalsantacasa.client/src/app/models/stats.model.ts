export interface Feedback {
  message: string;
  createdAt: string;
}

export interface Stats {
  news_count: number;
  documents_count: number;
  birthdays_count: number;
  users_count: number;
  recent_feedbacks: Feedback[];
}