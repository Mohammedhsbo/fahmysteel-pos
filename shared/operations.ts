export type AuditLogRecord = {
  id: number;
  userId: number | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  displayName: string | null;
};

export type CashierShiftRecord = {
  id: number;
  cashierId: number;
  cashierName: string;
  openingCashCents: number;
  closingCashCents: number | null;
  expectedCashCents: number | null;
  differenceCents: number | null;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  closingNotes: string | null;
};

export interface OperationsApi {
  listAuditLogs: (search?: string) => Promise<AuditLogRecord[]>;
  listShifts: (search?: string) => Promise<CashierShiftRecord[]>;
  openShift: (input: { openingCashCents: number }) => Promise<CashierShiftRecord>;
  closeShift: (shiftId: number, input: { closingCashCents: number; expectedCashCents: number; closingNotes?: string | null }) => Promise<CashierShiftRecord>;
}
