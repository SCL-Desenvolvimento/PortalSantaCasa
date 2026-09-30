export interface Benefit {
  id: number;
  title: string;
  description: string;
  category: string;
  eligibility: string;
  howToAccess: string;
  link: string | null;
  isActive: boolean;
}

export type BenefitInput = Omit<Benefit, 'id'>;
