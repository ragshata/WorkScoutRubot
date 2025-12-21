// src/App.tsx
import WebApp from "@twa-dev/sdk";
import { useEffect } from "react";
import AppRoutes from "./routes";

export default function App() {
  useEffect(() => {
    try {
      WebApp.ready();
      // включи, если хочешь всегда фуллскрин:
      // WebApp.expand();
    } catch {
      // если открыли не в Telegram, SDK может падать — это ок
    }
  }, []);

  return <AppRoutes />;
}
