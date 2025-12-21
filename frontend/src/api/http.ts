// src/api/http.ts
import WebApp from "@twa-dev/sdk";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://workscout.ru/api/v1";

// куда гнать гостя на выбор роли
const ROLE_ROUTE = "/role";
const BLOCKED_ROUTE = "/blocked";

/**
 * Базовый helper для запросов к API.
 * - Автоматически подставляет X-Tg-Init-Data из Telegram WebApp
 * - Обрабатывает 401/403 (в т.ч. заблокированного пользователя)
 * - Возвращает JSON или текст в зависимости от ответа
 */
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // ----- заголовки -----
  const headers = new Headers(options.headers || {});

  // Content-Type по умолчанию, если это не FormData и не задан руками
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // X-Tg-Init-Data (подписанная строка от Telegram)
  const initData = WebApp.initData || "";
  if (initData) {
    headers.set("X-Tg-Init-Data", initData);
  }

  // ----- сам запрос -----
  const res = await fetch(API_BASE_URL + path, {
    ...options,
    headers,
  });

  // 204 No Content
  if (res.status === 204) {
    return null as unknown as T;
  }

  const contentType = res.headers.get("content-type") || "";
  let rawText: string | null = null;
  let data: any = null;

  // хелпер: читаем тело один раз и пробуем распарсить JSON
  const readBodyOnce = async () => {
    if (rawText !== null) return;
    try {
      rawText = await res.text();
    } catch {
      rawText = null;
    }

    if (rawText && rawText.trim().startsWith("{")) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }
    }
  };

  const redirectSafe = (to: string) => {
    if (window.location.pathname !== to) {
      window.location.href = to;
    }
  };

  // ----- обработка ошибок -----
  if (!res.ok) {
    await readBodyOnce();

    const detail: string | undefined =
      (data && typeof data.detail === "string" && data.detail) ||
      (rawText || undefined);

    if (res.status === 401) {
      const code = typeof data?.detail === "string" ? data.detail : "";

      // НЕТ initData / не в Telegram
      if (code === "USER_NOT_AUTHENTICATED") {
        redirectSafe(ROLE_ROUTE);
        throw new Error("Не авторизован (открой мини-приложение в Telegram)");
      }

      // Пользователь ещё не зарегистрирован
      if (code === "USER_NOT_FOUND") {
        redirectSafe(ROLE_ROUTE);
        throw new Error("Пользователь не найден (нужна регистрация)");
      }

      // Подпись не прошла / initData протух
      if (code === "USER_INVALID_SIGNATURE") {
        redirectSafe(ROLE_ROUTE);
        throw new Error("Неверная подпись Telegram (initData)");
      }

      if (code === "USER_INITDATA_EXPIRED") {
        redirectSafe(ROLE_ROUTE);
        throw new Error("Сессия Telegram устарела. Перезапусти мини-приложение.");
      }

      // fallback
      redirectSafe(ROLE_ROUTE);
      throw new Error(detail || "Не авторизован");
    }

    if (res.status === 403) {
      const d = (detail || "").toLowerCase();

      if (d.includes("заблокирован")) {
        try {
          localStorage.setItem("rp_blocked", "1");
        } catch {
          /* ignore */
        }
        redirectSafe(BLOCKED_ROUTE);
        throw new Error(detail || "Пользователь заблокирован");
      }

      throw new Error(detail || "Нет доступа");
    }

    throw new Error(detail || `API error ${res.status}`);
  }

  // ----- успешный ответ -----
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }

  const text = await res.text();
  return text as unknown as T;
}
