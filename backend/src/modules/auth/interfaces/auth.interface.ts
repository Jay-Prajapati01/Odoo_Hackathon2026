import { Document } from 'mongoose';

export interface IAuthUser {
  userId: string;
  roleId: string;
  permissions: string[];
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  roleId: string;
  permissions: string[];
  jti?: string;
}

export interface UserSafe {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  status: string;
  isEmailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type { Document };
