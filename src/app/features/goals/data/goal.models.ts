// Modèles alignés sur le contrat back goal (Picsou_back main b451700).

export type GoalTemplate = 'savings' | 'travel' | 'purchase' | 'custom';
export type GoalStatus = 'active' | 'completed';

/** GET /api/goals[?status] (GoalResponse). */
export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  template: GoalTemplate;
  completed: boolean;
  progressPercent: number;
}

/** Élément de la liste des contributions (ContributionResponse). */
export interface Contribution {
  id: string;
  amount: number;
  date: string;
}

/** GET /api/goals/{id} (GoalDetailResponse). */
export interface GoalDetail {
  goal: Goal;
  contributions: Contribution[];
}

/** POST /api/goals (CreateGoalRequest). */
export interface CreateGoalRequest {
  name: string;
  targetAmount: number;
  deadline?: string | null;
  template?: GoalTemplate | null;
}

/** PATCH /api/goals/{id} (UpdateGoalRequest). */
export interface UpdateGoalRequest {
  name?: string | null;
  targetAmount?: number | null;
  deadline?: string | null;
}

/** POST /api/goals/{id}/contributions (AddContributionRequest). */
export interface AddContributionRequest {
  amount: number;
  date: string;
}
