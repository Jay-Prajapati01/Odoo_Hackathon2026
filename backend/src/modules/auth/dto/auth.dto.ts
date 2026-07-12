import { IUser } from '../models/user.model';
import { UserSafe } from '../interfaces/auth.interface';

export const toUserSafe = (user: IUser, roleId: string): UserSafe => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  role: roleId,
  department: user.department?.toString(),
  status: user.status,
  isEmailVerified: user.isEmailVerified,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export interface SignupDTO {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileDTO {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
}
