export interface Menu {
  id?: number;
  day_of_week: string;
  lunch_main?: string;
  lunch_side?: string;
  lunch_salad?: string;
  lunch_dessert?: string;
  dinner_main?: string;
  dinner_side?: string;
  dinner_salad?: string;
  dinner_dessert?: string;
  is_active: boolean;
  created_at: string;
}