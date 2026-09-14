export type UserRecord = {
  id: number;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'CASHIER';
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  failedLoginCount: number;
};

export type AppSetting = {
  key: string;
  value: string;
  updatedAt: string;
};

export interface AdminApi {
  listUsers: () => Promise<UserRecord[]>;
  createUser: (input: { username: string; displayName: string; password: string; role: 'ADMIN' | 'CASHIER' }) => Promise<UserRecord>;
  updateUser: (userId: number, input: { displayName?: string; role?: 'ADMIN' | 'CASHIER'; isActive?: boolean }) => Promise<UserRecord>;
  resetPassword: (userId: number, password: string) => Promise<void>;
  listSettings: () => Promise<AppSetting[]>;
  setSetting: (key: string, value: string) => Promise<AppSetting>;
}
