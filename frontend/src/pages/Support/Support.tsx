import Page from "../../components/layout/Page";

export default function Support() {
  return (
    <Page>
      {/* фон */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-800 via-blue-900 to-blue-950 z-0" />

      <div className="relative z-10 h-full flex flex-col gap-4 px-4 pt-6 pb-6 text-white">
        <header className="mb-1">
          <h1 className="text-xl font-semibold mb-1">Поддержка</h1>
          <p className="text-[12px] text-blue-100/80">
            Страница без лишних кнопок и форм. Иногда простота лечит.
          </p>
        </header>

        {/* конфиденциальность */}
        <section
          className="
            rounded-3xl border border-white/20 bg-white/5 backdrop-blur-xl
            px-4 py-4
          "
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-blue-100/70">
                Конфиденциально
              </div>
              <div className="text-[12px] text-blue-50 mt-1 leading-relaxed">
                Любая информация, которой ты делишься в рамках поддержки, рассматривается как
                конфиденциальная и используется только для решения вопроса.
              </div>
            </div>

            <span
              className="
                shrink-0 px-2 py-1 rounded-full text-[10px]
                bg-white/10 border border-white/15 text-blue-50
              "
            >
              private
            </span>
          </div>

          {/* заглушка под будущий текст */}
          <div className="mt-3 rounded-2xl border border-dashed border-white/25 bg-white/5 px-3 py-2">
            <div className="text-[10px] text-blue-100/70">
              Текст для добавления позже
            </div>
            <div className="text-[12px] text-blue-100/80">
              (сюда добавим нужный текст позже)
            </div>
          </div>
        </section>

        {/* нижняя "табличка" с контактом */}
        <section
          className="
            mt-auto
            rounded-3xl border border-white/20 bg-white/5 backdrop-blur-xl
            px-4 py-4
          "
        >
          <div className="text-[11px] font-semibold mb-2 text-blue-50">
            Есть вопросы?
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/15 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="text-[12px] text-blue-100/85 leading-relaxed">
                Если будут вопросы, напиши напрямую в Telegram. Отвечаем быстрее, чем “когда-нибудь”.
              </div>

              <a
                href="https://t.me/Roberto17490"
                target="_blank"
                rel="noreferrer"
                className="
                  shrink-0 inline-flex items-center gap-2
                  px-3 py-1.5 rounded-full text-[12px] font-medium
                  bg-white/10 border border-white/20
                  hover:bg-white/15 hover:border-white/30
                  transition
                "
              >
                <span className="text-blue-50">@Roberto17490</span>
                <span className="text-blue-100/70 text-[11px]">↗</span>
              </a>
            </div>

            <div className="mt-2 text-[10px] text-blue-200/70">
              Контакт: <span className="text-blue-100/90">--@Roberto17490</span>
            </div>
          </div>
        </section>
      </div>
    </Page>
  );
}
