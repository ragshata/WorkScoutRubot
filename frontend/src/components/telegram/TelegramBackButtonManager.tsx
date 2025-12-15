// src/components/telegram/TelegramBackButtonManager.tsx
import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { canGoBack, getFallbackPath, shouldShowBackButton } from "../../utils/tgBack";

export default function TelegramBackButtonManager() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tg = (window as any)?.Telegram?.WebApp;
  const show = useMemo(() => shouldShowBackButton(pathname), [pathname]);

  useEffect(() => {
    if (!tg?.BackButton) return;

    const handler = () => {
      if (canGoBack()) navigate(-1);
      else navigate(getFallbackPath(pathname), { replace: true });
    };

    if (show) {
      tg.BackButton.show();
      tg.BackButton.onClick(handler);
    } else {
      tg.BackButton.hide();
    }

    return () => {
      // снимаем именно наш обработчик
      tg.BackButton.offClick?.(handler);
      // и на всякий случай прячем (чтобы не залипала на экранах без кнопки)
      if (!show) tg.BackButton.hide();
    };
  }, [tg, show, pathname, navigate]);

  return null;
}
