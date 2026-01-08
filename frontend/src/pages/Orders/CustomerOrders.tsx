// src/pages/Orders/CustomerOrders.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Page from "../../components/layout/Page";
import Button from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";
import {
  type Order,
  type OrderStatus,
  getCustomerOrders,
  getOrderById,
  deleteOrder,
  completeOrder,
  getChatLink,
  showContacts,
  type ChatContactsResponse,
} from "../../api/orders";
import { createReview } from "../../api/reviews";

type Tab = "active" | "history";

type ContactsModalState = ChatContactsResponse & {
  orderTitle: string;
};

/* ---------- deep-link helpers ---------- */

function parseOpenOrderId(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* ---------- хелперы форматирования ---------- */

function formatDateShort(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

function formatDates(order: Order): string {
  const f = formatDateShort(order.start_date ?? null);
  const t = formatDateShort(order.end_date ?? null);

  if (f && t) return `${f} — ${t}`;
  if (f) return `с ${f}`;
  if (t) return `до ${t}`;
  return "Сроки не указаны";
}

function formatBudget(order: Order): string {
  if (order.budget_type === "negotiable") return "Договорная";

  if (order.budget_amount != null) {
    return `${order.budget_amount.toLocaleString("ru-RU")} ₽`;
  }

  return "Не указано";
}

function getStatusLabel(s: OrderStatus): string {
  switch (s) {
    case "active":
      return "Активен";
    case "in_progress":
      return "В работе";
    case "done":
      return "Завершён";
    case "cancelled":
    default:
      return "Отменён";
  }
}

function getStatusClass(s: OrderStatus): string {
  switch (s) {
    case "active":
      return "bg-sky-400/20 text-sky-100 border-sky-300/70";
    case "in_progress":
      return "bg-amber-400/20 text-amber-100 border-amber-300/70";
    case "done":
      return "bg-emerald-400/20 text-emerald-100 border-emerald-300/70";
    case "cancelled":
    default:
      return "bg-rose-400/20 text-rose-100 border-rose-300/70";
  }
}

/* ---------- сама страница ---------- */

export default function CustomerOrders() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // поддержка deep-link: /customer/orders?open=order_12 или ?open=12
  const openRaw = searchParams.get("open") ?? searchParams.get("order") ?? null;
  const openOrderId = useMemo(() => parseOpenOrderId(openRaw), [openRaw]);

  // скролл к заказу + подсветка карточки
  // article -> HTMLElement, не div. Типизируем широко, чтобы TS не истерил.
  const orderRefs = useRef<Record<number, HTMLElement | null>>({});
  const scrollAttemptsRef = useRef(0);
  const [highlightOrderId, setHighlightOrderId] = useState<number | null>(null);
  const [scrollToOrderId, setScrollToOrderId] = useState<number | null>(null);

  const [animate, setAnimate] = useState(false);
  const [tab, setTab] = useState<Tab>("active");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  // удаление
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);

  // завершение заказа
  const [completingId, setCompletingId] = useState<number | null>(null);

  // отзыв заказчика об исполнителе
  const [reviewTarget, setReviewTarget] = useState<{
    orderId: number;
    targetUserId: number;
    orderTitle: string;
  } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // контакты
  const [contactsModal, setContactsModal] =
    useState<ContactsModalState | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setAnimate(true));

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCustomerOrders();
        if (cancelled) return;
        setOrders(data);
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError(e?.message ?? "Не удалось загрузить ваши заказы");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
  // --- deep-link: открыть/подсветить конкретный заказ по query ---
  useEffect(() => {
    if (!openOrderId) return;
    if (loading) return;

    const existing = orders.find((o) => o.id === openOrderId);

    // если заказа нет в списке (например, пагинация/фильтры/обновление) — попробуем добрать по id
    if (!existing) {
      (async () => {
        try {
          const one = await getOrderById(openOrderId);
          setOrders((prev) =>
            prev.some((p) => p.id === one.id) ? prev : [one, ...prev]
          );
        } catch {
          // молча игнорируем: либо не ваш заказ, либо не существует
        }
      })();
      return;
    }

    const targetTab: Tab =
      existing.status === "active" || existing.status === "in_progress"
        ? "active"
        : "history";

    if (tab !== targetTab) setTab(targetTab);
    setScrollToOrderId(openOrderId);
  }, [openOrderId, loading, orders, tab]);

  useEffect(() => {
    if (!scrollToOrderId) return;

    const el = orderRefs.current[scrollToOrderId];

    if (!el) {
      if (scrollAttemptsRef.current < 12) {
        scrollAttemptsRef.current += 1;
        const t = setTimeout(() => setScrollToOrderId(scrollToOrderId), 80);
        return () => clearTimeout(t);
      }
      scrollAttemptsRef.current = 0;
      setScrollToOrderId(null);
      return;
    }

    scrollAttemptsRef.current = 0;

    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightOrderId(scrollToOrderId);

    // убираем query, чтобы при обновлении не прыгало снова
    navigate({ pathname: location.pathname, search: "" }, { replace: true });

    const t = setTimeout(() => setHighlightOrderId(null), 2200);
    setScrollToOrderId(null);
    return () => clearTimeout(t);
  }, [scrollToOrderId, navigate, location.pathname]);


  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const sortedOrders = useMemo(() => {
    const withCreated = orders.map((o) => ({
      ...o,
      _createdAt: o.created_at ? new Date(o.created_at).getTime() : 0,
    }));

    return withCreated.sort((a, b) => b._createdAt - a._createdAt);
  }, [orders]);

  const filtered = useMemo(() => {
    return sortedOrders.filter((o) =>
      tab === "active"
        ? o.status === "active" || o.status === "in_progress"
        : o.status === "done" || o.status === "cancelled"
    );
  }, [sortedOrders, tab]);

  const canChat = (order: Order) =>
    !!order.executor_id &&
    (order.status === "in_progress" || order.status === "done");

  const canShowContacts = (order: Order) => canChat(order);

  const canComplete = (order: Order) =>
    order.status === "in_progress" && !!order.executor_id;

  const canLeaveReview = (order: Order) =>
    order.status === "done" && !!order.executor_id;

  // ----- экшены -----

  const openDeleteConfirm = (order: Order) => {
    setDeleteTarget(order);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteOrder(deleteTarget.id);
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      showToast("Заказ удалён");
      setDeleteTarget(null);
    } catch (e: any) {
      console.error(e);
      showToast(e?.message ?? "Не удалось удалить заказ");
    } finally {
      setDeleting(false);
    }
  };

  const handleComplete = async (order: Order) => {
    if (!canComplete(order)) {
      showToast("Завершить можно только заказ с выбранным исполнителем");
      return;
    }

    try {
      setCompletingId(order.id);
      const updated = await completeOrder(order.id);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      showToast("Заказ отмечен как завершённый");
    } catch (e: any) {
      console.error(e);
      showToast(e?.message ?? "Не удалось завершить заказ");
    } finally {
      setCompletingId(null);
    }
  };

  const handleOpenChat = async (order: Order) => {
    if (!canChat(order)) {
      showToast("Чат доступен после выбора исполнителя.");
      return;
    }

    try {
      const data = await getChatLink(order.id);
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

  const handleShowContacts = async (order: Order) => {
    if (!canShowContacts(order)) {
      showToast("Контакты доступны после выбора исполнителя.");
      return;
    }

    try {
      const data = await showContacts(order.id);
      setContactsModal({
        ...data,
        orderTitle: order.title,
      });

      if (!data.both_accepted) {
        showToast(
          "Ваше согласие сохранено. Контакты исполнителя появятся после его подтверждения."
        );
      }
    } catch (e) {
      console.error(e);
      showToast("Не удалось обновить контакты");
    }
  };

  const openCustomerReviewForm = (order: Order) => {
    if (!canLeaveReview(order) || !order.executor_id) return;

    setReviewTarget({
      orderId: order.id,
      targetUserId: order.executor_id,
      orderTitle: order.title,
    });
    setReviewRating(5);
    setReviewText("");
  };

  const handleCustomerReviewSubmit = async () => {
    if (!reviewTarget) return;

    const text = reviewText.trim();
    if (text.length < 3) {
      showToast(
        "Добавь чуть более развёрнутый комментарий (минимум 3 символа)"
      );
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

      showToast("Отзыв об исполнителе отправлен на модерацию");
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

  return (
    <Page>
      {/* фон */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-800 via-blue-900 to-blue-950 z-0" />
      <div
        className="absolute inset-0 z-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.png')",
          backgroundSize: "220%",
        }}
      />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[260px] h-[260px] rounded-full bg-cyan-400/25 blur-3xl z-0" />

      {/* тосты */}
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

      {/* контент */}
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
          <div className="flex items-center justify_between mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-blue-200/80">
                WorkScout · Заказчик
              </div>
              <h1 className="text-xl font-semibold">Мои заказы</h1>
            </div>
            <Button
              className="text-[11px] px-3 py-1.5"
              onClick={() => navigate("/customer/orders/new")}
            >
              + Новый заказ
            </Button>
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
              onClick={() => setTab("history")}
              className={`
                flex-1 rounded-full py-1.5
                transition
                ${
                  tab === "history"
                    ? "bg-white text-blue-900 shadow-[0_0_18px_rgba(255,255,255,0.5)] font-medium"
                    : "text-blue-100"
                }
              `}
            >
              История
            </button>
          </div>
        </div>

        {/* список заказов */}
        <div className="flex-1 max-w-md w-full mx-auto space-y-3 pb-4">
          {loading && orders.length === 0 && (
            <div
              className="
                mt-6 rounded-3xl bg-white/10 border border-white/15
                backdrop-blur-2xl px-4 py-6 text-center text-sm text-blue-100
              "
            >
              Загружаем ваши заказы...
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

          {!loading && !error && filtered.length === 0 && (
            <div
              className="
                mt-6 rounded-3xl bg-white/10 border border-white/15
                backdrop-blur-2xl px-4 py-6 text-center text-sm text-blue-100
              "
            >
              В этом разделе пока пусто. Создайте заказ — он появится здесь.
            </div>
          )}

          {!loading &&
            filtered.map((order) => {
              const statusLabel = getStatusLabel(order.status);
              const statusClasses = getStatusClass(order.status);

              const showDelete =
                order.status === "active" || order.status === "cancelled";

              return (
                <article
                  key={order.id}
                  ref={(el) => {
                    orderRefs.current[order.id] = el;
                  }}
                  className={`
                    rounded-3xl bg-white/12 border border-white/20
                    backdrop-blur-2xl p-4
                    shadow-[0_0_30px_rgba(0,0,0,0.45)]
                    flex flex-col gap-3
                    ${
                      highlightOrderId === order.id
                        ? "ring-2 ring-cyan-300/90 shadow-[0_0_40px_rgba(34,211,238,0.55)]"
                        : ""
                    }
                  `}
                >
                  {/* верх: категории + статус */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(order.categories ?? []).map((cat) => (
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
                      {order.title}
                    </div>
                    <div className="text-[11px] text-blue-100">
                      {order.city}
                      {order.address ? ` · ${order.address}` : ""}
                    </div>
                  </div>

                  {/* бюджет + сроки */}
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <div className="text-blue-200/80">Бюджет</div>
                      <div className="text-white font-medium">
                        {formatBudget(order)}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-200/80">Сроки</div>
                      <div className="text-blue-50">
                        {formatDates(order)}
                      </div>
                    </div>
                  </div>

                  {/* описание */}
                  {order.description && (
                    <p className="text-[12px] text-blue-100 leading-snug">
                      {order.description}
                    </p>
                  )}

                  {/* кнопки */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {canChat(order) && (
                      <Button
                        className="flex-1 min-w-[120px] text-[13px] py-2.5"
                        onClick={() => handleOpenChat(order)}
                      >
                        Перейти в чат
                      </Button>
                    )}

                    {canShowContacts(order) && (
                      <button
                        type="button"
                        onClick={() => handleShowContacts(order)}
                        className="
                          flex-1 min-w-[120px] px-3 py-2.5 rounded-2xl text-[12px]
                          bg-white/6 border border-cyan-300/70
                          text-cyan-50 active:scale-[0.97] transition
                        "
                      >
                        Показать контакты
                      </button>
                    )}

                    {canComplete(order) && (
                      <button
                        type="button"
                        onClick={() => handleComplete(order)}
                        disabled={completingId === order.id}
                        className="
                          flex-1 min-w-[140px] px-3 py-2.5 rounded-2xl text-[12px]
                          bg-emerald-400 text-emerald-950
                          active:scale-[0.97] transition
                          disabled:opacity-60 disabled:cursor-not-allowed
                        "
                      >
                        {completingId === order.id
                          ? "Завершаем..."
                          : "Завершить заказ"}
                      </button>
                    )}

                    {canLeaveReview(order) && (
                      <button
                        type="button"
                        onClick={() => openCustomerReviewForm(order)}
                        className="
                          flex-1 min-w-[160px] px-3 py-2.5 rounded-2xl text-[12px]
                          bg-white/8 border border-white/30
                          text-blue-50 active:scale-[0.97] transition
                        "
                      >
                        Оставить отзыв об исполнителе
                      </button>
                    )}

                    {showDelete && (
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(order)}
                        className="
                          flex-1 min-w-[120px] px-3 py-2.5 rounded-2xl text-[12px]
                          bg-white/4 border border-rose-300/70
                          text-rose-100 active:scale-[0.97] transition
                        "
                      >
                        Удалить заказ
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
        </div>
      </div>

      {/* bottom-sheet удаления */}
      <BottomSheet
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
      >
        <div className="px-4 pt-3 pb-5 text-white">
          <div className="w-10 h-1 rounded-full bg-white/40 mx-auto mb-3" />
          <div className="text-[14px] font-semibold mb-2">
            Удалить заказ?
          </div>
          <p className="text-[12px] text-blue-100 mb-4">
            {deleteTarget?.title}
          </p>
          <p className="text-[11px] text-blue-200/80 mb-4">
            Заказ будет скрыт из списка. Исполнители больше не увидят его в
            ленте.
          </p>

          <div className="flex gap-3">
            <Button
              className="flex-1 text-[13px]"
              onClick={handleDeleteConfirmed}
              disabled={deleting}
            >
              {deleting ? "Удаляем..." : "Удалить"}
            </Button>
            <button
              type="button"
              onClick={() => !deleting && setDeleteTarget(null)}
              className="
                px-4 py-2 rounded-2xl text-[12px]
                bg-white/5 border border-white/20
                text-blue-100 active:scale-[0.97] transition
              "
              disabled={deleting}
            >
              Отмена
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* модалка отзыва заказчика об исполнителе */}
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
                Отзыв об исполнителе
              </div>
              <div className="text-[15px] font-semibold mb-3 leading-snug">
                {reviewTarget.orderTitle}
              </div>

              <div className="mb-2 text-[11px] text-blue-200/90">
                Оцените работу исполнителя и оставьте короткий комментарий.
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
                placeholder="Например: всё сделал аккуратно, был на связи, уложился в сроки..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                disabled={reviewSubmitting}
              />

              <div className="flex gap-3 mt-4">
                <Button
                  className="flex-1 text-[13px]"
                  onClick={handleCustomerReviewSubmit}
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

      {/* модалка контактов (заказчик ↔ исполнитель) */}
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
                  Вы согласились показать свои контакты. Контакты исполнителя
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
                    Вы (заказчик)
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
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/15 px-3 py-2.5">
                  <div className="text-[11px] text-blue-200/80 mb-1">
                    Исполнитель
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
                  {contactsModal.executor?.telegram_id && (
                    <a
                      href={`tg://user?id=${contactsModal.executor.telegram_id}`}
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