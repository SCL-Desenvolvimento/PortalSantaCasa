export interface User {
  id?: number;
  username: string;
  email?: string;
  userType: string;
  isActive: boolean;
  createdAt: string;
  photoUrl: string;
}
