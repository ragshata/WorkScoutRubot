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
 * Отправляем X-Tg-Init-Data (подписанная строка Telegram WebApp).
 */
export async function registerUser(payload: RegisterPayload): Promise<User> {
  const initData = WebApp.initData || "";

  // Если открыли не внутри Telegram, initData будет пустым
  // В проде лучше сразу сказать правду, а не пытаться "как-нибудь".
  if (!initData) {
    throw new Error("Открой мини-приложение внутри Telegram (initData пустой)");
  }

  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Tg-Init-Data": initData,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if ((data as any)?.detail) msg = (data as any).detail;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return res.json();
}
