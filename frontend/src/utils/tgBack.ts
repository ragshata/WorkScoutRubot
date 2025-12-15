// src/utils/tgBack.ts
export function canGoBack(): boolean {
  // React Router (browser history) обычно кладёт idx в history.state
  const idx = (window.history.state as any)?.idx;
  if (typeof idx === "number") return idx > 0;

  // запасной вариант для странных окружений
  return window.history.length > 1;
}

export function getRoleFromStorage(): "customer" | "executor" | "admin" | null {
  // Подстрой под свой проект. Это самый частый вариант.
  const raw =
    localStorage.getItem("role") ||
    localStorage.getItem("user_role") ||
    sessionStorage.getItem("role") ||
    sessionStorage.getItem("user_role");

  if (raw === "customer" || raw === "executor" || raw === "admin") return raw;
  return null;
}

export function getFallbackPath(currentPath: string): string {
  // Прячем человека от бесконечной пустоты: если он попал напрямую без истории.
  // Правила максимально “логичные”, насколько это вообще возможно в человеческих приложениях.

  if (currentPath === "/" || currentPath.startsWith("/welcome")) return "/role";
  if (currentPath.startsWith("/reg/")) return "/role";
  if (currentPath === "/role") return "/";

  if (currentPath.startsWith("/customer/")) return "/customer/orders";
  if (currentPath.startsWith("/executor/")) return "/executor/orders";

  if (currentPath === "/support") {
    const role = getRoleFromStorage();
    if (role === "customer" || role === "executor") return `/welcome/${role}`;
    if (role === "admin") return "/admin";
    return "/role";
  }

  if (currentPath === "/admin") return "/role";
  if (currentPath === "/blocked") return "/";

  // дефолт, если путь новый/неизвестный
  return "/role";
}

export function shouldShowBackButton(pathname: string): boolean {
  // На этих экранах BackButton обычно только мешает
  const hidden = ["/", "/role"];
  if (hidden.includes(pathname)) return false;
  if (pathname.startsWith("/welcome")) return false;
  return true;
}
