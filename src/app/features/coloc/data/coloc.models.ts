// Modèles alignés sur le contrat back coloc (Picsou_back Phase 4).

export type ColocRole = 'admin' | 'member';
export type SplitMethod = 'equal' | 'custom';

/** GET /api/coloc/groups (GroupResponse). */
export interface GroupSummary {
  id: string;
  name: string;
  memberCount: number;
  yourRole: ColocRole;
}

/** Membre d'un groupe (MemberResponse). */
export interface Member {
  userId: string;
  email: string;
  firstName: string;
  role: ColocRole;
}

/** GET /api/coloc/groups/{id} (GroupDetailResponse). */
export interface GroupDetail {
  id: string;
  name: string;
  members: Member[];
}

/** Dépense partagée (SharedExpenseResponse), orientée user courant via yourShare. */
export interface SharedExpense {
  id: string;
  transactionId: string;
  payerUserId: string;
  payerName: string;
  description: string;
  date: string;
  total: number;
  splitMethod: SplitMethod;
  settled: boolean;
  yourShare: number | null;
}

/** Solde net signé d'un membre (BalanceResponse.MemberBalance). */
export interface MemberBalance {
  userId: string;
  name: string;
  net: number;
}

/** Virement simplifié suggéré (TransferResponse). */
export interface Transfer {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

/** GET /api/coloc/groups/{id}/balances (BalanceResponse). */
export interface Balance {
  yourNet: number;
  netToSettle: number;
  balances: MemberBalance[];
  transfers: Transfer[];
}

/** Événement temps réel diffusé sur /topic/coloc/{groupId} (ColocEvent). */
export interface ColocEvent {
  type: string;
  actorName: string;
  description: string;
  amount: number | null;
  at: string;
}

/** POST /api/coloc/groups (CreateGroupRequest). */
export interface CreateGroupRequest {
  name: string;
}

/** POST /api/coloc/groups/{id}/members (AddMemberRequest). */
export interface AddMemberRequest {
  email: string;
}

/** Part personnalisée (AddSharedExpenseRequest.CustomPart). */
export interface CustomPart {
  userId: string;
  amount: number;
}

/** POST /api/coloc/groups/{groupId}/expenses (AddSharedExpenseRequest). */
export interface AddSharedExpenseRequest {
  payerUserId: string;
  accountId: string;
  categoryId?: string | null;
  description: string;
  date: string;
  total: number;
  splitMethod: SplitMethod;
  participantUserIds?: string[] | null;
  customParts?: CustomPart[] | null;
}
