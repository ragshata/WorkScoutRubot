// src/api/auth.ts

import { API_BASE_URL } from "./http";
import type { User, UserRole } from "./users";

export interface RegisterPayload {
  telegram_id: number;
  role: UserRole;
  first_name: string;
  last_name?: string;
  phone: string;
  city?: string;
  experience_years?: number | null;

  // здесь тоже массив
  specializations?: string[] | null;

  portfolio_photos?: string[] | null;

  // доп. поля из схемы
  about?: string | null;
  about_orders?: string | null;
}

/**
 * Регистрация пользователя.
 * Специально отдельный fetch, чтобы чуть по-особенному обработать ошибки.
 */
export async function registerUser(payload: RegisterPayload): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if ((data as any).detail) msg = (data as any).detail;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return res.json();
}
