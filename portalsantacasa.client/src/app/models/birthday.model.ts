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

export interface UpcomingBirthday {
  name: string;
  birthDate: string;
  department: string | null;
  position: string | null;
  photoUrl: string | null;
  isToday: boolean;
}
