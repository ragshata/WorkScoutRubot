import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Page from "../../components/layout/Page";

type Role = "executor" | "customer";

export default function Welcome() {
  const navigate = useNavigate();
  const params = useParams<{ role?: Role }>();

  const role: Role = params.role === "customer" ? "customer" : "executor";
  const isExecutor = role === "executor";

  const [animate, setAnimate] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    requestAnimationFrame(() => setAnimate(true));

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const x = e.gamma ?? 0;
      const y = e.beta ?? 0;

      setParallax({
        x: x / 70,
        y: y / 70,
      });
    };

    const handleMouse = (e: MouseEvent) => {
      const xr = (e.clientX / window.innerWidth) * 2 - 1;
      const yr = (e.clientY / window.innerHeight) * 2 - 1;

      setParallax({
        x: xr * 0.35,
        y: yr * 0.35,
      });
    };

    window.addEventListener("deviceorientation", handleOrientation);
    window.addEventListener("mousemove", handleMouse);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  const items = isExecutor
    ? [
        {
          key: "available",
          title: "Доступные заказы",
          desc: "Фильтры по городу, категориям, бюджету и срокам.",
          icon: "📋",
          primary: true,
          to: "/executor/orders",
        },
        {
          key: "responses",
          title: "Мои отклики",
          desc: "Текущие и сделанные отклики в одном месте.",
          icon: "📨",
          primary: false,
          to: "/executor/responses",
        },
        {
          key: "profile",
          title: "Мой профиль",
          desc: "Навыки, опыт и портфолио с фото работ.",
          icon: "👤",
          primary: false,
          to: "/executor/profile",
        },
        {
          key: "support",
          title: "Поддержка и право",
          desc: "Поддержка сервиса и правовая информация.",
          icon: "⚖️",
          primary: false,
          to: "/support",
        },
      ]
    : [
        {
          key: "create",
          title: "Создать заказ",
          desc: "Мастер создания: что нужно, бюджет и сроки.",
          icon: "➕",
          primary: true,
          to: "/customer/orders/new",
        },
        {
          key: "orders",
          title: "Мои заказы",
          desc: "Текущие и завершённые заказы, редактирование и удаление.",
          icon: "📁",
          primary: false,
          to: "/customer/orders",
        },
        {
          key: "profile",
          title: "Мой профиль",
          desc: "Ваши данные, контакты и предпочтения.",
          icon: "👤",
          primary: false,
          to: "/customer/profile",
        },
        {
          key: "support",
          title: "Поддержка и право",
          desc: "Поддержка сервиса и правовая информация.",
          icon: "⚖️",
          primary: false,
          to: "/support",
        },
      ];

  const title = isExecutor ? "Меню исполнителя" : "Меню заказчика";
  const subtitle = isExecutor
    ? "Смотрите доступные заказы, управляйте откликами и профилем."
    : "Создавайте заказы, управляйте задачами и профилем.";

  return (
    <Page>
      {/* фон */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-800 via-blue-900 to-blue-950 z-0" />

      {/* текстурка / шум */}
      <div
        className="absolute inset-0 z-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.png')",
          backgroundSize: "220%",
          transform: `translate(${parallax.x * -10}px, ${
            parallax.y * -10
          }px)`,
          transition: "transform 0.15s ease-out",
        }}
      />

      {/* лёгкое свечение */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[260px] h-[260px] rounded-full bg-cyan-400/25 blur-3xl z-0" />

      {/* контент */}
      <div
        className={`
          relative z-10 flex flex-col items-center justify-center
          text-center px-5 min-h-screen
          transition-all duration-700 ease-out
          ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
        style={{
          transform: `translate(${parallax.x * 10}px, ${
            parallax.y * 10
          }px)`,
        }}
      >
        {/* бейдж роли */}
        <div className="mb-3 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] uppercase tracking-[0.16em] text-blue-100 backdrop-blur-xl">
            {isExecutor ? "Режим: исполнитель" : "Режим: заказчик"}
          </span>
        </div>

        {/* заголовок */}
        <h1 className="text-2xl font-extrabold text-white mb-2 drop-shadow-[0_0_22px_rgba(0,200,255,0.7)]">
          {title}
        </h1>

        <p className="text-blue-100 text-xs mb-8 max-w-xs">{subtitle}</p>

        {/* меню */}
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => navigate(item.to)}
              className={`
                w-full rounded-3xl px-5 py-4
                flex items-center gap-3 text-left
                backdrop-blur-2xl
                transition-all duration-300
                active:scale-[0.97]
                ${
                  item.primary
                    ? "bg-white/18 border border-white/35 text-white hover:shadow-[0_0_30px_rgba(0,200,255,0.6)]"
                    : "bg-white/10 border border-white/20 text-white hover:shadow-[0_0_24px_rgba(140,160,255,0.5)]"
                }
              `}
            >
              <div className="text-3xl drop-shadow">{item.icon}</div>
              <div>
                <div className="text-sm font-semibold">{item.title}</div>
                <div className="text-[11px] text-blue-100">{item.desc}</div>
              </div>
            </button>
          ))}

        </div>

        <div className="mt-10 text-[10px] text-blue-300/70">
          WorkScout · быстрые заказы рядом
        </div>
      </div>
    </Page>
  );
}
