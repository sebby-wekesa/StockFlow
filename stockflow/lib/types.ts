// lib/types.ts
export type UserRole = 'PENDING' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'SALES' | 'PACKAGING' | 'WAREHOUSE';

export const ROLE_PATHS: Record<UserRole, string> = {
  PENDING: '/dashboard',
  ADMIN: '/admin/dashboard',
  MANAGER: '/manager',
  OPERATOR: '/operator',
  SALES: '/operator/queue',
  PACKAGING: '/packaging',
  WAREHOUSE: '/warehouse',
};

export const ROLE_NAMES: Record<UserRole, string> = {
  PENDING: 'Pending Approval',
  ADMIN: 'Administrator',
  MANAGER: 'Production Manager',
  OPERATOR: 'Operator',
  SALES: 'Sales Team',
  PACKAGING: 'Packaging Team',
  WAREHOUSE: 'Warehouse Team',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  PENDING: 'var(--muted)',
  ADMIN: 'var(--accent)',
  MANAGER: 'var(--accent)',
  OPERATOR: 'var(--purple)',
  SALES: 'var(--teal)',
  PACKAGING: 'var(--green)',
  WAREHOUSE: 'var(--muted)',
};