// src/pages/Executor/ExecutorResponses.tsx

import { useEffect, useMemo, useState } from "react";
import Page from "../../components/layout/Page";
import Button from "../../components/ui/Button";
import {
  type ExecutorResponseDto,
  getExecutorResponses,
} from "../../api/responses";
import { createReview } from "../../api/reviews";
import {
  getChatLink,
  showContacts,
  type ChatContactsResponse,
} from "../../api/orders";

type ResponseStatus = "waiting" | "chosen" | "declined" | "done";
type Tab = "active" | "done";

type ResponseItem = {
  id: string;
  orderId: number;
  customerId: number;
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

type ContactsModalState = ChatContactsResponse & {
  orderTitle: string;
};

/* ---------- модалка «Подробнее» ---------- */

function ResponseDetailsModal({
  open,
  item,
  onClose,
  onLeaveReview,
  onOpenChat,
  onShowContacts,
}: {
  open: boolean;
  item: ResponseItem | null;
  onClose: () => void;
  onLeaveReview?: (item: ResponseItem) => void;
  onOpenChat?: (item: ResponseItem) => void;
  onShowContacts?: (item: ResponseItem) => void;
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

  const canChat = item.status === "chosen" || item.status === "done";

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
              mb-3 rounded-2xl bg-black/20 border border-white/10
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

          {canChat && (onOpenChat || onShowContacts) && (
            <div className="flex gap-2 mb-2">
              {onOpenChat && (
                <Button
                  className="flex-1 text-[13px] py-2.5"
                  onClick={() => onOpenChat(item)}
                >
                  Перейти в чат
                </Button>
              )}
              {onShowContacts && (
                <button
                  type="button"
                  onClick={() => onShowContacts(item)}
                  className="
                    flex-1 px-3 py-2.5 rounded-2xl text-[12px]
                    bg-white/10 border border-cyan-300/70
                    text-cyan-50 active:scale-[0.97] transition
                  "
                >
                  Показать контакты
                </button>
              )}
            </div>
          )}

          {item.status === "done" && onLeaveReview && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLeaveReview(item);
              }}
              className="
                w-full mb-2 px-3 py-2.5 rounded-2xl text-[13px]
                bg-emerald-400 text-emerald-950
                active:scale-[0.97] transition
              "
            >
              Оставить отзыв о заказчике
            </button>
          )}

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

  // состояние для формы отзыва исполнителя
  const [reviewTarget, setReviewTarget] = useState<{
    orderId: number;
    targetUserId: number;
    orderTitle: string;
  } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // модалка с контактами
  const [contactsModal, setContactsModal] =
    useState<ContactsModalState | null>(null);

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
          orderId: r.order.id,
          customerId: r.order.customer_id,
          orderTitle: r.order.title,
          city: r.order.city,
          address: r.order.address,
          categories: r.order.categories,
          budgetLabel: r.order.budget_label,
          dates: r.order.dates_label,
          myPriceLabel:
            r.price !== null
              ? `${r.price.toLocaleString("ru-RU")} ₽`
              : "Готов обсудить",
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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleCancel = (id: string) => {
    // пока чисто фронтово — просто переводим отклик в "declined"
    setResponses((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "declined" } : r))
    );
    showToast("Отклик отменён (пока только локально)");

    // TODO: когда сделаешь бэкенд-метод, сюда можно дернуть:
    // await cancelExecutorResponse(Number(id))
  };

  const openExecutorReviewForm = (item: ResponseItem) => {
    if (item.status !== "done") return;

    setReviewTarget({
      orderId: item.orderId,
      targetUserId: item.customerId,
      orderTitle: item.orderTitle,
    });
    setReviewRating(5);
    setReviewText("");
  };

  const handleExecutorReviewSubmit = async () => {
    if (!reviewTarget) return;

    const text = reviewText.trim();
    if (text.length < 3) {
      showToast("Добавь чуть более развёрнутый комментарий (минимум 3 символа)");
      return;
    }

    try {
      setReviewSubmitting(true);
      await createReview({
        order_id: reviewTarget.orderId,
        target_user_id: reviewTarget.targetUserId,
        rating: reviewRating,
        text,
      });

      showToast("Отзыв о заказчике отправлен на модерацию");

      setReviewTarget(null);
      setReviewText("");
    } catch (e: any) {
      console.error(e);
      const msg = String(e?.message ?? "");
      if (msg.includes("уже оставили отзыв") || msg.includes("уже оставили")) {
        showToast("Вы уже оставили отзыв по этому заказу");
        setReviewTarget(null);
      } else {
        showToast("Не удалось отправить отзыв");
      }
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleOpenChat = async (item: ResponseItem) => {
    if (item.status !== "chosen" && item.status !== "done") {
      showToast("Чат доступен после выбора вас исполнителем");
      return;
    }

    try {
      const data = await getChatLink(item.orderId);
      if (data?.chat_link) {
        window.location.href = data.chat_link;
      } else {
        showToast("Не удалось получить ссылку на чат");
      }
    } catch (e) {
      console.error(e);
      showToast("Не удалось открыть чат");
    }
  };

  const handleShowContacts = async (item: ResponseItem) => {
    if (item.status !== "chosen" && item.status !== "done") {
      showToast("Контакты доступны после выбора вас исполнителем");
      return;
    }

    try {
      const data = await showContacts(item.orderId);
      setContactsModal({
        ...data,
        orderTitle: item.orderTitle,
      });

      if (!data.both_accepted) {
        showToast(
          "Ваши контакты отправлены. Контакты заказчика появятся после его согласия."
        );
      }
    } catch (e) {
      console.error(e);
      showToast("Не удалось обновить контакты");
    }
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
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <Button
                      className="flex-1 min-w-[120px] text-[13px] py-2.5"
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
                          flex-1 min-w-[120px] px-3 py-2.5 rounded-2xl text-[12px]
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
        onLeaveReview={openExecutorReviewForm}
        onOpenChat={handleOpenChat}
        onShowContacts={handleShowContacts}
      />

      {/* Модалка отзыва исполнителя о заказчике */}
      {reviewTarget && (
        <>
          <div
            className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-md"
            onClick={() => !reviewSubmitting && setReviewTarget(null)}
          />
          <div className="fixed inset-0 z-[96] flex items-center justify-center px-4 pointer-events-none">
            <div
              className="
                pointer-events-auto w-full max-w-md
                rounded-3xl border border-white/20
                bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950
                shadow-[0_18px_50px_rgba(0,0,0,0.9)]
                px-5 pt-4 pb-5
                text-white
              "
            >
              <div className="w-10 h-1 rounded-full bg-white/30 mx-auto mb-3" />

              <div className="text-[11px] uppercase tracking-[0.18em] text-blue-200/80 mb-1">
                Отзыв о заказчике
              </div>
              <div className="text-[15px] font-semibold mb-3 leading-snug">
                {reviewTarget.orderTitle}
              </div>

              <div className="mb-2 text-[11px] text-blue-200/90">
                Оцените работу с заказчиком и оставьте короткий комментарий.
                Отзыв увидит админ перед публикацией.
              </div>

              <div className="flex gap-1.5 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`
                      text-[20px] leading-none
                      ${
                        star <= reviewRating
                          ? "text-yellow-400"
                          : "text-slate-600"
                      }
                    `}
                    onClick={() => setReviewRating(star)}
                    disabled={reviewSubmitting}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea
                className="
                  w-full rounded-2xl bg-black/30 border border-white/15
                  px-3 py-2 text-[13px] text-white
                  placeholder:text-blue-200/70
                  outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60
                "
                rows={3}
                placeholder="Например: заказчик вовремя оплатил, был на связи, чётко сформулировал задачу..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                disabled={reviewSubmitting}
              />

              <div className="flex gap-3 mt-4">
                <Button
                  className="flex-1 text-[13px]"
                  onClick={handleExecutorReviewSubmit}
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting ? "Отправляю..." : "Отправить отзыв"}
                </Button>
                <button
                  type="button"
                  onClick={() => !reviewSubmitting && setReviewTarget(null)}
                  className="
                    px-4 py-2 rounded-2xl text-[12px]
                    bg-white/5 border border-white/20
                    text-blue-100 active:scale-[0.97] transition
                  "
                  disabled={reviewSubmitting}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Модалка с контактами (заказчик ↔ исполнитель) */}
      {contactsModal && (
        <>
          <div
            className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-md"
            onClick={() => setContactsModal(null)}
          />
          <div className="fixed inset-0 z-[96] flex items-center justify-center px-4 pointer-events-none">
            <div
              className="
                pointer-events-auto w-full max-w-md
                rounded-3xl border border-white/20
                bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950
                shadow-[0_18px_50px_rgba(0,0,0,0.9)]
                px-5 pt-4 pb-5
                text-white
              "
            >
              <div className="w-10 h-1 rounded-full bg-white/30 mx-auto mb-3" />
              <div className="text-[11px] uppercase tracking-[0.18em] text-blue-200/80 mb-1">
                Контакты по заказу
              </div>
              <div className="text-[14px] font-semibold mb-3">
                {contactsModal.orderTitle}
              </div>

              {!contactsModal.both_accepted && (
                <div className="mb-3 text-[12px] text-amber-100 bg-amber-500/10 border border-amber-400/60 rounded-2xl px-3 py-2">
                  Вы согласились показать свои контакты. Контакты заказчика
                  появятся после его подтверждения.
                </div>
              )}

              {contactsModal.both_accepted && (
                <div className="mb-3 text-[12px] text-blue-100 bg-white/5 border border-white/15 rounded-2xl px-3 py-2">
                  Обе стороны согласились показать контакты. Можно общаться
                  напрямую.
                </div>
              )}

              <div className="space-y-3 text-[12px]">
                <div className="rounded-2xl bg-white/5 border border-white/15 px-3 py-2.5">
                  <div className="text-[11px] text-blue-200/80 mb-1">
                    Вы (исполнитель)
                  </div>
                  <div className="font-medium">
                    {contactsModal.executor
                      ? `${contactsModal.executor.first_name} ${
                          contactsModal.executor.last_name ?? ""
                        }`.trim()
                      : "—"}
                  </div>
                  <div className="text-blue-100 mt-0.5">
                    Телефон:{" "}
                    {contactsModal.executor?.phone
                      ? contactsModal.executor.phone
                      : "—"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/15 px-3 py-2.5">
                  <div className="text-[11px] text-blue-200/80 mb-1">
                    Заказчик
                  </div>
                  <div className="font-medium">
                    {contactsModal.customer
                      ? `${contactsModal.customer.first_name} ${
                          contactsModal.customer.last_name ?? ""
                        }`.trim()
                      : "—"}
                  </div>
                  <div className="text-blue-100 mt-0.5">
                    Телефон:{" "}
                    {contactsModal.customer?.phone
                      ? contactsModal.customer.phone
                      : "—"}
                  </div>
                  {contactsModal.customer?.telegram_id && (
                    <a
                      href={`tg://user?id=${contactsModal.customer.telegram_id}`}
                      className="inline-block mt-1 text-[12px] text-cyan-300 underline"
                    >
                      Написать в Telegram
                    </a>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setContactsModal(null)}
                className="
                  mt-4 w-full px-4 py-2.5 rounded-2xl text-[13px]
                  bg-white/10 border border-white/20
                  text-blue-50 active:scale-[0.97] transition
                "
              >
                Закрыть
              </button>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
