export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  rank: string | null;
  clearance: string;
  role: string;
  permissions: string[];
  metadata?: Record<string, any>;
  lastLoginAt?: string;
  createdAt?: string;
  totpEnabled?: boolean;
  avatarUrl?: string | null;
}

export interface SessionInfo {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  is_current: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthResponse {
  requires2FA?: boolean;
  tempToken?: string;
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  category: string;
  order: number;
  permissions?: string[];
  children?: NavItem[];
}

export interface DashboardWidget {
  id: string;
  title: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
}

export interface ModuleManifest {
  name: string;
  version: string;
  category: string;
  permissions: string[];
  apiPrefix: string;
  navItems: NavItem[];
  dashboardWidgets: DashboardWidget[];
  globalSearchEnabled: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  related_type: string | null;
  related_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export type Clearance = 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';
export type ReportStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'DISSEMINATED' | 'CANCELLED';
export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SourceType = 'HUMINT' | 'OSINT' | 'SIGINT' | 'GEOINT' | 'MASINT' | 'TECHINT';
export type CaseStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'CLOSED' | 'COLD';
