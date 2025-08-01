export interface Feedback {
  message: string;
  created_at: string;
}

export interface Stats {
  news_count: number;
  documents_count: number;
  birthdays_count: number;
  users_count: number;
  recent_feedbacks: Feedback[];
}