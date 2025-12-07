// src/api/users.ts

import { apiFetch } from "./http";

// --- типы ---

export type UserRole = "customer" | "executor" | "admin";

export interface User {
  id: number;
  telegram_id: number;
  role: UserRole;
  first_name: string;
  last_name?: string | null;
  phone?: string | null;
  city?: string | null;
  experience_years?: number | null;

  // теперь массив специализаций
  specializations?: string[] | null;

  // на будущее: массив урлов / id фоток
  portfolio_photos?: string[] | null;
}

// --- localStorage ---

const LS_USER_KEY = "rp_user";

export function saveUserToStorage(user: User) {
  localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
}

export function getUserFromStorage(): User | null {
  const raw = localStorage.getItem(LS_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

// ===== Профиль пользователя =====

export type UserDto = {
  id: number;
  role: "executor" | "customer" | "admin";
  first_name: string;
  last_name?: string | null;
  phone?: string | null;
  city?: string | null;

  // для исполнителя
  about?: string | null;
  specializations?: string[] | null;

  // для заказчика
  company_name?: string | null;
  about_orders?: string | null;

  // опционально, если потом добавим
  rating?: number | null;
  orders_count?: number | null;
};

export type UpdateUserPayload = Partial<{
  first_name: string;
  last_name: string | null;
  phone: string | null;
  city: string | null;
  about: string | null;
  specializations: string[];
  company_name: string | null;
  about_orders: string | null;
}>;

export async function getMe(): Promise<UserDto> {
  return apiFetch("/users/me");
}

export async function updateMe(payload: UpdateUserPayload): Promise<UserDto> {
  return apiFetch("/users/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
