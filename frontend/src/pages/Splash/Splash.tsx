import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function getStartParam(): string | null {
  const tg = (window as any)?.Telegram?.WebApp;
  const fromTg = tg?.initDataUnsafe?.start_param;
  if (typeof fromTg === "string" && fromTg.trim()) return fromTg.trim();

  const qs = new URLSearchParams(window.location.search);
  const fromUrl = qs.get("startapp") || qs.get("startApp") || qs.get("start_param");
  return fromUrl && fromUrl.trim() ? fromUrl.trim() : null;
}

export default function Splash() {
  const navigate = useNavigate();

  const [showBudget, setShowBudget] = useState(false);
  const [showDeadline, setShowDeadline] = useState(false);
  const [showWorkType, setShowWorkType] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const hasDeepLink = !!getStartParam();

    // параллакс сетки (телефон + мышь)
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const x = e.gamma ?? 0;
      const y = e.beta ?? 0;
      setParallax({ x: x / 40, y: y / 40 });
    };

    const handleMouse = (e: MouseEvent) => {
      const xr = (e.clientX / window.innerWidth) * 2 - 1;
      const yr = (e.clientY / window.innerHeight) * 2 - 1;
      setParallax({ x: xr * 0.6, y: yr * 0.6 });
    };

    window.addEventListener("deviceorientation", handleOrientation);
    window.addEventListener("mousemove", handleMouse);

    // Если пришли через startapp/start_param, навигацию делает StartParamRouter.
    // Тут не надо через 3 секунды уезжать на /role и ломать deep-link.
    if (hasDeepLink) {
      return () => {
        window.removeEventListener("deviceorientation", handleOrientation);
        window.removeEventListener("mousemove", handleMouse);
      };
    }

    // таймлайн по ходу пути
    const t1 = setTimeout(() => setShowBudget(true), 600); // первый узел
    const t2 = setTimeout(() => setShowDeadline(true), 900); // второй
    const t3 = setTimeout(() => setShowWorkType(true), 1200); // третий
    const t4 = setTimeout(() => setShowCheck(true), 1600); // галочка у исполнителя
    const t5 = setTimeout(() => setFadeOut(true), 2500); // затухание сцены
    const t6 = setTimeout(() => navigate("/role"), 3300); // переход

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, [navigate]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-blue-950 text-white">
      {/* сетка + параллакс */}
      <div
        className="absolute inset-0 blue-grid-bg opacity-60"
        style={{
          transform: `translate3d(${parallax.x * 12}px, ${parallax.y * 10}px, 0)`,
          transition: "transform 0.15s ease-out",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/60 via-blue-950 to-black" />

      {/* Контент */}
      <div
        className={`
          relative z-10 flex flex-col items-center justify-center h-full px-6
          transition-opacity duration-700
          ${fadeOut ? "opacity-0" : "opacity-100"}
        `}
      >
        {/* Логотип / текст */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold tracking-wide drop-shadow-[0_0_24px_rgba(0,200,255,0.8)]">
            Workscout
          </h1>
          <p className="mt-2 text-xs text-blue-100 tracking-wide">
            Путь от заказа до исполнителя — за секунды
          </p>
        </div>

        {/* Линия-путь */}
        <div className="w-full max-w-md flex items-center justify-between gap-3">
          {/* Заказчик слева */}
          <div className="flex flex-col items-center gap-1">
            <div className="endpoint-circle">🧑‍💼</div>
            <span className="text-[11px] text-blue-100">Заказчик</span>
          </div>

          {/* Центральная зона: линия + узлы */}
          <div className="flex-1">
            <div className="relative w-full h-28">
              {/* основная линия */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 120" preserveAspectRatio="none">
                <polyline className="path-line" points="10,80 70,40 130,60 190,30 250,55 310,35" />
                {/* огоньки, бегущие по пути */}
                <polyline className="path-lights" points="10,80 70,40 130,60 190,30 250,55 310,35" />
              </svg>

              {/* Узлы: бюджет, сроки, вид работ */}
              <div
                className={`
                  node-chip
                  ${showBudget ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}
                `}
                style={{ left: "20%", top: "18%" }}
              >
                💰 Бюджет
              </div>

              <div
                className={`
                  node-chip
                  ${showDeadline ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}
                `}
                style={{ left: "48%", top: "55%" }}
              >
                ⏱️ Сроки
              </div>

              <div
                className={`
                  node-chip
                  ${showWorkType ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}
                `}
                style={{ left: "72%", top: "20%" }}
              >
                🧱 Вид работ
              </div>
            </div>
          </div>

          {/* Исполнитель справа */}
          <div className="flex flex-col items-center gap-1">
            <div className="endpoint-circle relative">
              👷
              {showCheck && <span className="absolute -bottom-1 -right-1 text-[14px]">✅</span>}
            </div>
            <span className="text-[11px] text-blue-100">Исполнитель</span>
          </div>
        </div>
      </div>
    </div>
  );
}