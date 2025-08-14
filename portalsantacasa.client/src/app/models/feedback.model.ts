export interface Feedback {
  id?: number;
  name: string;
  email?: string;
  department?: string;
  category: string;
  targetDepartment: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
