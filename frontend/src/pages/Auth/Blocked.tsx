// src/pages/Auth/Blocked.tsx

import Page from "../../components/layout/Page";
import Button from "../../components/ui/Button";

export default function BlockedPage() {
  const handleGoToSupport = () => {
    // сюда подставь своего бота / суппорт-аккаунт
    const tgUrl = "https://t.me/your_support_bot";
    window.location.href = tgUrl;
  };

  return (
    <Page>
      {/* фон такой же, как на других экранах */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-800 via-blue-900 to-blue-950 z-0" />
      <div
        className="absolute inset-0 z-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.png')",
          backgroundSize: "220%",
        }}
      />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[260px] h-[260px] rounded-full bg-red-400/25 blur-3xl z-0" />

      <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-8 pb-10 min-h-screen text-white">
        <div className="max-w-sm w-full text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] text-red-200/80 mb-2">
            Доступ ограничен
          </div>

          <h1 className="text-2xl font-semibold mb-3">
            Аккаунт заблокирован
          </h1>

          <p className="text-[13px] text-blue-100 mb-4">
            Ваш аккаунт заблокирован администратором площадки. Новые действия в
            сервисе недоступны.
          </p>

          <p className="text-[12px] text-blue-200 mb-6">
            Если вы считаете, что это ошибка или хотите уточнить причину
            блокировки, напишите в поддержку.
          </p>

          <Button
            className="w-full text-[13px] mb-3"
            onClick={handleGoToSupport}
          >
            Написать в поддержку в Telegram
          </Button>

          <div className="text-[11px] text-blue-300/80">
            Вы всё ещё можете читать старые сообщения в самом Telegram-чате по
            заказам.
          </div>
        </div>
      </div>
    </Page>
  );
}
