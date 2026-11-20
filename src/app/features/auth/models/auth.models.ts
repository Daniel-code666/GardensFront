export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: number;
  name: string;
  lastName: string;
  email: string;
  roleName: string;
  roleId: number;
  isAdmin: boolean;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresAtUtc: string;
  user: AuthenticatedUser;
}

export interface AuthSession {
  accessToken: string;
  expiresAtUtc: string;
  user: AuthenticatedUser;
}

export interface UserDeleteRequest {
  selectedIds: number[]
}
