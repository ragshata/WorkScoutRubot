import { useNavigate } from "react-router-dom";
import Page from "../../components/layout/Page";
import { useEffect, useState } from "react";
import { getMe } from "../../api/users";


export default function RoleSelect() {
  const navigate = useNavigate();

  const [animate, setAnimate] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  // ПАРАЛЛАКС + проверка роли на бэке
  useEffect(() => {
    requestAnimationFrame(() => setAnimate(true));

    let cancelled = false;

    // чек текущего пользователя
    (async () => {
      try {
        const me = await getMe();
        if (cancelled) return;

        if (me.role === "executor") {
          navigate("/welcome/executor", { replace: true });
          return;
        }
        if (me.role === "customer") {
          navigate("/welcome/customer", { replace: true });
          return;
        }
        // guest / нет роли — просто показываем выбор
      } catch (e) {
        // гость / 401 / 404 — молча игнорим, оставляем выбор роли
        console.log("RoleSelect: /auth/me failed or guest", e);
      }
    })();

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const x = e.gamma ?? 0;
      const y = e.beta ?? 0;

      setParallax({
        x: x / 60,
        y: y / 60,
      });
    };

    const handleMouse = (e: MouseEvent) => {
      const xRatio = (e.clientX / window.innerWidth) * 2 - 1;
      const yRatio = (e.clientY / window.innerHeight) * 2 - 1;

      setParallax({
        x: xRatio * 0.4,
        y: yRatio * 0.4,
      });
    };

    window.addEventListener("deviceorientation", handleOrientation);
    window.addEventListener("mousemove", handleMouse);

    return () => {
      cancelled = true;
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, [navigate]);

  return (
    <Page>
      {/* СИНИЙ ФОН */}
      <div className="absolute inset-0 bg-blue-700 z-0" />

      {/* ВОДЯНАЯ ПОДЛОЖКА — мягкая рябь */}
      <div
        className="absolute inset-0 z-0 opacity-[0.25]"
        style={{
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.png')",
          backgroundSize: "220%",
          filter: "blur(4px)",
          transform: `translate(${parallax.x * -15}px, ${
            parallax.y * -15
          }px)`,
          transition: "transform 0.15s ease-out",
        }}
      />

      {/* Стеклянная дымка */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-xl z-0" />

      {/* Контент */}
      <div
        className={`
          relative z-10 flex flex-col items-center justify-center
          text-center px-4 min-h-[80vh]
          transition-all duration-700 ease-out
          ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
        `}
        style={{
          transform: `translate(${parallax.x * 12}px, ${
            parallax.y * 12
          }px)`,
        }}
      >
        {/* Заголовок */}
        <h1 className="text-4xl font-extrabold mb-4 text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.35)]">
          Кто вы?
        </h1>

        <p className="text-blue-200 text-sm mb-8">
          Выберите свою роль
        </p>

        {/* Карточки */}
        <div className="flex flex-col gap-6 w-full max-w-sm">
          {/* Исполнитель */}
          <button
            onClick={() => navigate("/reg/executor")}
            className="
              flex items-center gap-4 p-5 w-full rounded-3xl
              bg-white/15 backdrop-blur-2xl border border-white/30
              text-white
              transition-all duration-300
              hover:shadow-[0_0_30px_rgba(0,180,255,0.55)]
              active:scale-[0.97]
            "
            style={{
              transform: `translate(${parallax.x * 3}px, ${
                parallax.y * 3
              }px)`,
            }}
          >
            <div className="text-5xl drop-shadow">🧱</div>
            <div className="text-left">
              <div className="text-xl font-semibold drop-shadow">
                Я исполнитель
              </div>
              <div className="text-blue-100 text-sm">
                Беру заказы и делаю работу
              </div>
            </div>
          </button>

          {/* Заказчик */}
          <button
            onClick={() => navigate("/reg/customer")}
            className="
              flex items-center gap-4 p-5 w-full rounded-3xl
              bg-white/15 backdrop-blur-2xl border border-white/30
              text-white
              transition-all duration-300
              hover:shadow-[0_0_30px_rgba(255,120,255,0.55)]
              active:scale-[0.97]
            "
            style={{
              transform: `translate(${parallax.x * -3}px, ${
                parallax.y * -3
              }px)`,
            }}
          >
            <div className="text-5xl drop-shadow">🧑‍💼</div>
            <div className="text-left">
              <div className="text-xl font-semibold drop-shadow">
                Я заказчик
              </div>
              <div className="text-blue-100 text-sm">
                Ищу исполнителей
              </div>
            </div>
          </button>
        </div>
      </div>
    </Page>
  );
}
