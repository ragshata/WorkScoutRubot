// src/api/auth.ts
import WebApp from "@twa-dev/sdk";
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

  specializations?: string[] | null;
  portfolio_photos?: string[] | null;

  about?: string | null;
  about_orders?: string | null;
}

/**
 * Регистрация пользователя.
 * Теперь отправляем X-Tg-Init-Data (подписанная строка Telegram).
 */
export async function registerUser(payload: RegisterPayload): Promise<User> {
  const initData = WebApp.initData || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (initData) {
    headers["X-Tg-Init-Data"] = initData;
  }

  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers,
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
