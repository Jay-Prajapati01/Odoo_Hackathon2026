import { Response } from 'express';
import { httpStatus } from './http-status';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  timestamp: string;
}

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  errors?: unknown,
  meta?: ApiResponse<T>['meta']
): Response => {
  const body: ApiResponse<T> = {
    success: statusCode < 400,
    message,
    data,
    errors,
    meta,
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(body);
};

export const sendPaginatedResponse = <T>(
  res: Response,
  message: string,
  data: T[],
  page: number,
  limit: number,
  total: number,
  statusCode = httpStatus.OK
): Response => {
  return sendResponse(res, statusCode, message, data, undefined, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 0,
  });
};
