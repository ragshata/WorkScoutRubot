// src/api/http.ts

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

/**
 * Базовый helper для запросов к API.
 * Автоматически подставляет X-User-Id из localStorage ("rp_user").
 */
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const stored = localStorage.getItem("rp_user");

  let headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.id) {
        headers = {
          ...headers,
          "X-User-Id": String(parsed.id),
        };
      }
    } catch {
      // если кривые данные — просто игнорим
    }
  }

  const res = await fetch(API_BASE_URL + path, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) {
    // @ts-expect-error: 204 без тела
    return null;
  }

  return res.json() as Promise<T>;
}
