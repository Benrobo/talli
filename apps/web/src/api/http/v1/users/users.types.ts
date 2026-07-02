import type { ApiSuccess, User } from "@app/shared";

export type ListUsersResponse = ApiSuccess<{ users: User[] }>;
export type GetUserResponse = ApiSuccess<{ user: User }>;
