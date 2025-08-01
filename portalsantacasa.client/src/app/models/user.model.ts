export interface User {
  id?: number;
  username: string;
  email?: string;
  user_type: string;
  is_active: boolean;
  created_at: string;
}