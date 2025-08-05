export interface Birthday {
  id?: number;
  name: string;
  birthDate: Date;
  department?: string;
  position?: string;
  photoUrl?: string;
  isActive: boolean;
  createdAt: Date;
}
