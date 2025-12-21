// App.tsx
import WebApp from "@twa-dev/sdk";
import { useEffect } from "react";
import AppRoutes from "./routes";

export default function App() {
  useEffect(() => {
    // Говорим Telegram: мини-апп загрузился
    try {
      WebApp.ready();
      // WebApp.expand(); // можно включить если хочешь всегда на весь экран
    } catch {
      // если открыли не внутри Telegram, SDK может чудить, и это нормально
    }
  }, []);

  return <AppRoutes />;
}
