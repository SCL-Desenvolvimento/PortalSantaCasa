export interface Birthday {
  id?: number;
  name: string;
  birthDate: string;
  department?: string;
  position?: string;
  photoUrl?: string;
  isActive: boolean;
  createdAt: Date;
}
