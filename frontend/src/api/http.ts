// src/api/http.ts

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

/**
 * Базовый helper для запросов к API.
 * - Автоматически подставляет X-User-Id из localStorage ("rp_user")
 * - Обрабатывает 401/403 (в т.ч. заблокированного пользователя)
 * - Возвращает JSON или текст в зависимости от ответа
 */
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // ----- заголовки -----
  const headers = new Headers(options.headers || {});

  // Content-Type по умолчанию только если не FormData и не задан руками
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // X-User-Id из rp_user
  const stored = localStorage.getItem("rp_user");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.id) {
        headers.set("X-User-Id", String(parsed.id));
      }
    } catch {
      // если в localStorage мусор — просто игнорим
    }
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

  // ----- обработка ошибок -----
  if (!res.ok) {
    await readBodyOnce();

    const detail: string | undefined =
      (data && typeof data.detail === "string" && data.detail) ||
      (rawText || undefined);

    // 401 — не авторизован
    if (res.status === 401) {
      try {
        localStorage.removeItem("rp_user");
      } catch {
        /* ignore */
      }
      // можно поправить на свой роут логина/онбординга
      window.location.href = "/";
      throw new Error(detail || "Не авторизован");
    }

    // 403 — либо заблокирован, либо нет прав
    if (res.status === 403) {
      const d = (detail || "").toLowerCase();

      // спец-кейс: заблокирован
      if (d.includes("заблокирован")) {
        try {
          localStorage.removeItem("rp_user");
          localStorage.setItem("rp_blocked", "1");
        } catch {
          /* ignore */
        }
        window.location.href = "/blocked";
        throw new Error(detail || "Пользователь заблокирован");
      }

      // остальные 403
      throw new Error(detail || "Нет доступа");
    }

    // все прочие ошибки
    throw new Error(detail || `API error ${res.status}`);
  }

  // ----- успешный ответ -----

  // JSON
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }

  // fallback: текст
  const text = await res.text();
  return text as unknown as T;
}
