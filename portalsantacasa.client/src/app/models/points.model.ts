export interface PointIdentity {
  name: string;
  re: string;
  sector: string;
}

export interface RegisterPointsRequest extends PointIdentity {
  eventType: string;
  difficulty?: string | null;
  referenceId?: string | null;
  referenceTitle?: string | null;
  timeSeconds?: number | null;
}

export interface PointEventResponse {
  id: number;
  name: string;
  re: string;
  sector?: string;
  eventType: string;
  difficulty?: string;
  referenceId?: string;
  points: number;
  createdAt: string;
}

export interface PointsRankingItem {
  re: string;
  name: string;
  sector?: string;
  totalPoints: number;
  totalEvents: number;
  lastAccess: string;
}

export interface PointRule {
  id: number;
  eventType: string;
  difficulty?: string | null;
  points: number;
  bonusPoints?: number | null;
  bonus?: number | null;
  isActive: boolean;
  description?: string | null;
}

export interface UpdatePointRuleRequest {
  points: number;
  bonus?: number | null;
  isActive: boolean;
  description?: string | null;
}
