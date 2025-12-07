import { useEffect, useMemo, useState } from "react";
import Page from "../../components/layout/Page";
import Button from "../../components/ui/Button";
import {
  type ExecutorResponseDto,
  getExecutorResponses,
} from "../../api/responses";

type ResponseStatus = "waiting" | "chosen" | "declined" | "done";
type Tab = "active" | "done";

type ResponseItem = {
  id: string;
  orderTitle: string;
  city: string;
  address: string;
  categories: string[];
  budgetLabel: string;
  dates: string;
  myPriceLabel: string;
  comment: string;
  status: ResponseStatus;
  createdAt: number;
};

/* ---------- модалка «Подробнее» ---------- */

function ResponseDetailsModal({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: ResponseItem | null;
  onClose: () => void;
}) {
  if (!open || !item) return null;

  const statusLabel =
    item.status === "waiting"
      ? "Ожидает ответа заказчика"
      : item.status === "chosen"
      ? "Вас выбрали исполнителем"
      : item.status === "declined"
      ? "Заказчик выбрал другого"
      : "Заказ выполнен";

  const statusColor =
    item.status === "waiting"
      ? "bg-amber-400 text-amber-950"
      : item.status === "chosen"
      ? "bg-emerald-400 text-emerald-950"
      : item.status === "declined"
      ? "bg-rose-400 text-rose-950"
      : "bg-blue-400 text-blue-950";

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/45 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[91] flex items-center justify-center px-4 pointer-events-none">
        <div
          className="
            pointer-events-auto w-full max-w-md
            rounded-3xl border border-white/20
            bg-gradient-to-b from-blue-900 via-blue-950 to-slate-950
            shadow-[0_18px_50px_rgba(0,0,0,0.8)]
            px-5 pt-4 pb-5
            text-white
          "
        >
          <div className="w-10 h-1 rounded-full bg-white/30 mx-auto mb-3" />

          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-blue-200/80 mb-1">
                Мой отклик · #{item.id}
              </div>
              <div className="text-[15px] font-semibold leading-snug">
                {item.orderTitle}
              </div>
            </div>
            <div className="text-right text-[11px] text-blue-100">
              {item.city}
              <div className="text-[10px] text-blue-300/80">
                {item.address}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {item.categories.map((cat) => (
              <span
                key={cat}
                className="
                  px-2.5 py-1 rounded-full text-[10px]
                  bg-cyan-500/25 border border-cyan-400/70
                  text-white
                "
              >
                {cat}
              </span>
            ))}
            <span
              className={`
                px-2.5 py-1 rounded-full text-[10px] font-medium
                ${statusColor}
              `}
            >
              {statusLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3 text-[12px]">
            <div>
              <div className="text-blue-200/80 text-[11px]">Бюджет заказа</div>
              <div className="text-white font-medium">{item.budgetLabel}</div>
            </div>
            <div>
              <div className="text-blue-200/80 text-[11px]">Моя цена</div>
              <div className="text-emerald-200 font-medium">
                {item.myPriceLabel}
              </div>
            </div>
            <div>
              <div className="text-blue-200/80 text-[11px]">Сроки</div>
              <div className="text-blue-50">{item.dates}</div>
            </div>
          </div>

          <div className="mb-3">
            <div className="text-[11px] text-blue-200/90 mb-1">
              Мой комментарий
            </div>
            <div className="rounded-2xl bg-black/25 border border-white/12 px-3 py-2.5 text-[12px] text-blue-50 leading-snug">
              {item.comment}
            </div>
          </div>

          <div
            className="
              mb-4 rounded-2xl bg-black/20 border border-white/10
              px-3 py-2.5 text-[11px] text-blue-200/90
            "
          >
            {item.status === "waiting" && (
              <>Ждём решения заказчика. Уведомление придёт в Telegram.</>
            )}
            {item.status === "chosen" && (
              <>
                Вас выбрали исполнителем. Общение и детали заказа — в чате по
                этому заказу.
              </>
            )}
            {item.status === "declined" && (
              <>
                Заказчик выбрал другого исполнителя. Отклик сохранён в истории
                для статистики.
              </>
            )}
            {item.status === "done" && (
              <>
                Заказ отмечен как выполненный. Отзыв заказчика появится в вашем
                профиле после модерации.
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              w-full px-3 py-2.5 rounded-2xl text-[13px]
              bg-white/10 border border-white/22
              text-blue-50 active:scale-[0.97] transition
            "
          >
            Закрыть
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------- сама страница ---------- */

export default function ExecutorResponses() {
  const [animate, setAnimate] = useState(false);
  const [tab, setTab] = useState<Tab>("active");

  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<ResponseItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setAnimate(true));

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getExecutorResponses();

        if (cancelled) return;

        const mapped: ResponseItem[] = data.map((r: ExecutorResponseDto) => ({
          id: String(r.id),
          orderTitle: r.order.title,
          city: r.order.city,
          address: r.order.address,
          categories: r.order.categories,
          budgetLabel: r.order.budget_label,
          dates: r.order.dates_label,
          myPriceLabel:
            r.price !== null ? `${r.price.toLocaleString("ru-RU")} ₽` : "Готов обсудить",
          comment: r.comment,
          status: r.status,
          createdAt: new Date(r.created_at).getTime(),
        }));

        setResponses(mapped);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("Не удалось загрузить ваши отклики");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      responses
        .filter((r) =>
          tab === "active"
            ? r.status === "waiting" || r.status === "chosen"
            : r.status === "declined" || r.status === "done"
        )
        .sort((a, b) => b.createdAt - a.createdAt),
    [tab, responses]
  );

  const handleCancel = (id: string) => {
    // пока чисто фронтово — просто переводим отклик в "declined"
    setResponses((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "declined" } : r
      )
    );
    setToast("Отклик отменён (пока только локально)");
    setTimeout(() => setToast(null), 2200);

    // TODO: когда сделаешь бэкенд-метод, сюда можно дернуть:
    // await cancelExecutorResponse(Number(id))
  };

  return (
    <Page>
      {/* фон как в других экранах исполнителя */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-800 via-blue-900 to-blue-950 z-0" />
      <div
        className="absolute inset-0 z-0 opacity-[0.22]"
        style={{
          backgroundImage: "url('https://grainy-gradients.vercel.app/noise.png')",
          backgroundSize: "220%",
        }}
      />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[260px] h-[260px] rounded-full bg-cyan-400/25 blur-3xl z-0" />

      {toast && (
        <div
          className="
            fixed top-3 left-1/2 -translate-x-1/2 z-[80]
            rounded-2xl px-4 py-2.5
            bg-slate-900/90 text-white text-[12px]
            shadow-[0_10px_30px_rgba(0,0,0,0.6)]
          "
        >
          {toast}
        </div>
      )}

      <div
        className={`
          relative z-10 flex flex-col px-5 pt-4 pb-6 min-h-screen
          text-white
          transition-all duration-600 ease-out
          ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
        `}
      >
        {/* хедер */}
        <div className="max-w-md w-full mx-auto mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-blue-200/80">
                WorkScout · Исполнитель
              </div>
              <h1 className="text-xl font-semibold">Мои отклики</h1>
            </div>
            <div className="text-[11px] text-blue-100">
              {filtered.length} в списке
            </div>
          </div>

          {/* табы */}
          <div
            className="
              mt-3 bg-white/10 border border-white/20 rounded-full
              p-1 flex text-[12px]
            "
          >
            <button
              type="button"
              onClick={() => setTab("active")}
              className={`
                flex-1 rounded-full py-1.5
                transition
                ${
                  tab === "active"
                    ? "bg-white text-blue-900 shadow-[0_0_18px_rgba(255,255,255,0.5)] font-medium"
                    : "text-blue-100"
                }
              `}
            >
              Текущие
            </button>
            <button
              type="button"
              onClick={() => setTab("done")}
              className={`
                flex-1 rounded-full py-1.5
                transition
                ${
                  tab === "done"
                    ? "bg-white text-blue-900 shadow-[0_0_18px_rgba(255,255,255,0.5)] font-medium"
                    : "text-blue-100"
                }
              `}
            >
              Сделанные
            </button>
          </div>
        </div>

        {/* список откликов */}
        <div className="flex-1 max-w-md w-full mx-auto space-y-3 pb-4">
          {loading && responses.length === 0 && (
            <div
              className="
                mt-6 rounded-3xl bg-white/10 border border-white/15
                backdrop-blur-2xl px-4 py-6 text-center text-sm text-blue-100
              "
            >
              Загружаем ваши отклики...
            </div>
          )}

          {error && !loading && (
            <div
              className="
                mt-4 rounded-2xl bg-red-500/15 border border-red-400/70
                px-4 py-3 text-[12px] text-red-50
              "
            >
              {error}
            </div>
          )}

          {!loading &&
            filtered.map((item) => {
              const isWaiting = item.status === "waiting";
              const statusLabel =
                item.status === "waiting"
                  ? "Ожидает ответа"
                  : item.status === "chosen"
                  ? "Вас выбрали"
                  : item.status === "declined"
                  ? "Отказ"
                  : "Выполнен";

              const statusClasses =
                item.status === "waiting"
                  ? "bg-amber-400/20 text-amber-100 border-amber-300/60"
                  : item.status === "chosen"
                  ? "bg-emerald-400/20 text-emerald-100 border-emerald-300/70"
                  : item.status === "declined"
                  ? "bg-rose-400/20 text-rose-100 border-rose-300/70"
                  : "bg-blue-400/20 text-blue-100 border-blue-300/70";

              return (
                <article
                  key={item.id}
                  className="
                    rounded-3xl bg-white/12 border border-white/20
                    backdrop-blur-2xl p-4
                    shadow-[0_0_30px_rgba(0,0,0,0.45)]
                    flex flex-col gap-3
                  "
                >
                  {/* верхняя строка */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {item.categories.map((cat) => (
                        <span
                          key={cat}
                          className="
                            px-2.5 py-1 rounded-full text-[10px]
                            bg-cyan-500/25 border border-cyan-300/70
                            text-white
                          "
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                    <span
                      className={`
                        px-2.5 py-1 rounded-full text-[10px] border
                        ${statusClasses}
                      `}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  {/* заголовок + адрес */}
                  <div>
                    <div className="text-sm font-semibold mb-1">
                      {item.orderTitle}
                    </div>
                    <div className="text-[11px] text-blue-100">
                      {item.city} · {item.address}
                    </div>
                  </div>

                  {/* деньги + сроки */}
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <div className="text-blue-200/80">Бюджет заказа</div>
                      <div className="text-white font-medium">
                        {item.budgetLabel}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-200/80">Моя цена</div>
                      <div className="text-emerald-200 font-medium">
                        {item.myPriceLabel}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-200/80">Сроки</div>
                      <div className="text-blue-50">{item.dates}</div>
                    </div>
                  </div>

                  {/* комментарий */}
                  <p className="text-[12px] text-blue-100 leading-snug">
                    {item.comment}
                  </p>

                  {/* кнопки */}
                  <div className="mt-2 flex gap-2">
                    <Button
                      className="flex-1 text-[13px] py-2.5"
                      onClick={() => {
                        setSelected(item);
                        setDetailsOpen(true);
                      }}
                    >
                      Подробнее
                    </Button>

                    {tab === "active" && isWaiting && (
                      <button
                        type="button"
                        onClick={() => handleCancel(item.id)}
                        className="
                          flex-1 px-3 py-2.5 rounded-2xl text-[12px]
                          bg-white/6 border border-rose-300/70
                          text-rose-100 active:scale-[0.97] transition
                        "
                      >
                        Отменить
                      </button>
                    )}
                  </div>
                </article>
              );
            })}

          {!loading && filtered.length === 0 && !error && (
            <div
              className="
                mt-6 rounded-3xl bg-white/10 border border-white/15
                backdrop-blur-2xl px-4 py-6 text-center text-sm text-blue-100
              "
            >
              В этом разделе пока пусто. Откликайтесь на заказы в ленте — они
              появятся здесь.
            </div>
          )}
        </div>
      </div>

      <ResponseDetailsModal
        open={detailsOpen}
        item={selected}
        onClose={() => setDetailsOpen(false)}
      />
    </Page>
  );
}
