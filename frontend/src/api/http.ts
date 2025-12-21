// src/api/http.ts
import WebApp from "@twa-dev/sdk";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://workscout.ru/api/v1";

const ROLE_ROUTE = "/role";
const BLOCKED_ROUTE = "/blocked";

// Страницы, где НЕ надо устраивать бесконечные редиректы
const AUTH_PAGES = ["/role", "/reg", "/reg/executor", "/reg/customer", "/blocked"];

function isOnAuthPage() {
  const p = window.location.pathname;
  return AUTH_PAGES.some((x) => p === x || p.startsWith(x + "/"));
}

function clearLocalUser() {
  try {
    localStorage.removeItem("rp_user");
  } catch {
    /* ignore */
  }
}

function redirectSafe(to: string) {
  if (window.location.pathname !== to) {
    window.location.href = to;
  }
}

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
  const headers = new Headers(options.headers || {});

  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // initData должен быть непустой строкой внутри Telegram Mini App
  const initData = WebApp.initData || "";
  if (initData) {
    headers.set("X-Tg-Init-Data", initData);
  }

  // Если это защищённый запрос и initData пустой, лучше сразу честно упасть,
  // чем гонять пользователя по кругу.
  // Исключения: открытые эндпоинты можно добавить сюда при необходимости.
  const likelyProtected =
    !path.startsWith("/openapi") &&
    !path.startsWith("/docs") &&
    !path.startsWith("/auth/register");

  if (likelyProtected && !initData) {
    clearLocalUser();
    if (!isOnAuthPage()) redirectSafe(ROLE_ROUTE);
    throw new Error("Открой мини-приложение внутри Telegram (нет initData)");
  }

  const res = await fetch(API_BASE_URL + path, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return null as unknown as T;
  }

  const contentType = res.headers.get("content-type") || "";
  let rawText: string | null = null;
  let data: any = null;

  const readBodyOnce = async () => {
    if (rawText !== null) return;
    try {
      rawText = await res.text();
    } catch {
      rawText = null;
    }

    // иногда FastAPI возвращает JSON-массив или строку detail, поэтому парсим аккуратно
    if (rawText) {
      const t = rawText.trim();
      if (t.startsWith("{") || t.startsWith("[")) {
        try {
          data = JSON.parse(t);
        } catch {
          data = null;
        }
      }
    }
  };

  if (!res.ok) {
    await readBodyOnce();

    const detail: string | undefined =
      (data && typeof data.detail === "string" && data.detail) ||
      (rawText || undefined);

    if (res.status === 401) {
      const code = typeof data?.detail === "string" ? data.detail : "";

      // 401 всегда означает: текущий пользователь не определён.
      // Чтобы не было "меню -> рега -> меню", чистим rp_user.
      clearLocalUser();

      // НЕТ initData / не в Telegram
      if (code === "USER_NOT_AUTHENTICATED") {
        if (!isOnAuthPage()) redirectSafe(ROLE_ROUTE);
        throw new Error("Не авторизован (открой мини-приложение в Telegram)");
      }

      // Пользователь ещё не зарегистрирован
      if (code === "USER_NOT_FOUND") {
        if (!isOnAuthPage()) redirectSafe(ROLE_ROUTE);
        throw new Error("Пользователь не найден (нужна регистрация)");
      }

      // Подпись не прошла
      if (code === "USER_INVALID_SIGNATURE") {
        if (!isOnAuthPage()) redirectSafe(ROLE_ROUTE);
        throw new Error("Неверная подпись Telegram (initData). Проверь токен на сервере.");
      }

      // initData протух
      if (code === "USER_INITDATA_EXPIRED") {
        if (!isOnAuthPage()) redirectSafe(ROLE_ROUTE);
        throw new Error("Сессия Telegram устарела. Закрой и заново открой мини-приложение.");
      }

      if (!isOnAuthPage()) redirectSafe(ROLE_ROUTE);
      throw new Error(detail || "Не авторизован");
    }

    if (res.status === 403) {
      const d = (detail || "").toLowerCase();

      if (d.includes("заблокирован")) {
        clearLocalUser();
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

  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }

  const text = await res.text();
  return text as unknown as T;
}
