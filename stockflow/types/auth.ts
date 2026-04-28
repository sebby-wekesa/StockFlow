export type UserRole =
  | 'PENDING'
  | 'ADMIN'
  | 'MANAGER'
  | 'OPERATOR'
  | 'WAREHOUSE'
  | 'SALES'
  | 'PACKAGING';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  department?: string;
}

// Map roles to their dedicated base routes
export const ROLE_HOME_PAGES: Record<UserRole, string> = {
  PENDING: '/operator',
  ADMIN: '/admin/dashboard',
  MANAGER: '/manager',
  OPERATOR: '/operator',
  WAREHOUSE: '/warehouse',
  SALES: '/operator/queue',
  PACKAGING: '/packaging'
};