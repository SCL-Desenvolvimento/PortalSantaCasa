export interface User {
  id?: number;
  username: string;
  email?: string;
  userType: string;
  department: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  photoUrl: string;
}
