import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Role = "customer" | "executor" | "admin";

type Target = {
  pathname: string;
  search?: string;
};

function getStoredRole(): Role | null {
  try {
    const raw = localStorage.getItem("rp_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { role?: string };
    const role = parsed?.role;
    if (role === "customer" || role === "executor" || role === "admin") {
      return role;
    }
    return null;
  } catch {
    return null;
  }
}

function getStartParam(): string | null {
  // 1) Telegram Mini App
  const tg = (window as any)?.Telegram?.WebApp;
  const fromTg = tg?.initDataUnsafe?.start_param;
  if (typeof fromTg === "string" && fromTg.trim()) return fromTg.trim();

  // 2) Fallback: если кто-то открыл в обычном браузере
  const qs = new URLSearchParams(window.location.search);
  const fromUrl = qs.get("startapp") || qs.get("startApp") || qs.get("start_param");
  return fromUrl && fromUrl.trim() ? fromUrl.trim() : null;
}

function parseOrderId(sp: string): number | null {
  const m = sp.match(/^order_(\d+)$/i);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveTarget(sp: string, role: Role | null): Target | null {
  const orderId = parseOrderId(sp);
  if (orderId) {
    // Для заказчика и исполнителя разные экраны
    const isExecutor = role === "executor";
    return {
      pathname: isExecutor ? "/executor/orders" : "/customer/orders",
      search: `?open=${orderId}`,
    };
  }

  if (sp === "my_orders") {
    return { pathname: "/customer/orders" };
  }

  if (sp === "create_order") {
    return { pathname: "/customer/orders/new" };
  }

  if (sp === "my_responses") {
    return { pathname: "/executor/responses" };
  }

  // Твой тестовый deep-link: ?startapp=open
  if (sp === "open") {
    return { pathname: "/" };
  }

  return null;
}

export default function StartParamRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const sp = getStartParam();
    if (!sp) return;

    const role = getStoredRole();
    const target = resolveTarget(sp, role);
    if (!target) return;

    handled.current = true;

    const next = target.pathname + (target.search ?? "");

    // replace, чтобы не оставлять мусор в истории и не ловить «назад» в странные состояния
    navigate(next, { replace: true });
  }, [navigate, location.key]);

  return null;
}
