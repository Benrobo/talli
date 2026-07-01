/**
 * Standard JSON envelope returned by every engine endpoint.
 * Mirrors `services/engine/src/lib/send-response.ts`.
 */
export interface ApiSuccess<T = unknown> {
  message?: string;
  data: T;
}

export interface ApiError {
  message: string;
  data?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  currency: string;
  status: string;
  isActive: boolean;
  isOwner: boolean;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
