import { useEffect, useMemo, useState } from "react";
import Page from "../../components/layout/Page";
import Button from "../../components/ui/Button";
import {
  adminGetUsers,
  adminSetUserBlocked,
  adminGetOrders,
  adminUpdateOrderStatus,
  adminGetSupportTickets,
  adminUpdateSupportTicketStatus,
  adminGetReviews,
  adminSetReviewStatus,
  adminGetStats,
  type AdminUser,
  type AdminOrder,
  type AdminOrderStatus,
  type AdminStats,
  type AdminSupportTicket,
} from "../../api/admin";
import type { Review } from "../../api/reviews";

type AdminTab = "users" | "orders" | "reviews" | "support";

export default function AdminDashboard() {
  const [animate, setAnimate] = useState(false);
  const [tab, setTab] = useState<AdminTab>("users");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // отдельные флажки на задворках
  const [busyUserIds, setBusyUserIds] = useState<number[]>([]);
  const [busyOrderIds, setBusyOrderIds] = useState<number[]>([]);
  const [busyReviewIds, setBusyReviewIds] = useState<number[]>([]);
  const [busyTicketIds, setBusyTicketIds] = useState<number[]>([]);

  useEffect(() => {
    requestAnimationFrame(() => setAnimate(true));
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          usersData,
          ordersData,
          reviewsData,
          ticketsData,
          statsData,
        ] = await Promise.all([
          adminGetUsers(),
          adminGetOrders(),
          adminGetReviews(),
          adminGetSupportTickets(),
          adminGetStats(),
        ]);

        setUsers(usersData);
        setOrders(ordersData);
        setReviews(reviewsData);
        setTickets(ticketsData);
        setStats(statsData);
      } catch (e: any) {
        setError(e?.message ?? "Не удалось загрузить данные админки");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const totalBlocked = useMemo(
    () => users.filter((u) => u.is_blocked).length,
    [users]
  );

  const getOrderStatusLabel = (s: AdminOrderStatus) => {
    if (s === "active") return "Активен";
    if (s === "in_progress") return "В работе";
    if (s === "done") return "Завершён";
    return "Отменён";
  };

  const getOrderStatusClass = (s: AdminOrderStatus) => {
    if (s === "active")
      return "bg-sky-400/20 text-sky-100 border-sky-300/70";
    if (s === "in_progress")
      return "bg-amber-400/20 text-amber-100 border-amber-300/70";
    if (s === "done")
      return "bg-emerald-400/20 text-emerald-100 border-emerald-300/70";
    return "bg-rose-400/20 text-rose-100 border-rose-300/70";
  };

  const getTicketStatusLabel = (s: AdminSupportTicket["status"]) => {
    if (s === "open") return "Открыто";
    if (s === "in_progress") return "В работе";
    return "Закрыто";
  };

  const getTicketStatusClass = (s: AdminSupportTicket["status"]) => {
    if (s === "open")
      return "bg-rose-400/20 text-rose-100 border-rose-300/70";
    if (s === "in_progress")
      return "bg-amber-400/20 text-amber-100 border-amber-300/70";
    return "bg-emerald-400/20 text-emerald-100 border-emerald-300/70";
  };

  const getReviewStatusLabel = (s: Review["status"]) => {
    if (s === "pending") return "На модерации";
    if (s === "approved") return "Опубликован";
    return "Скрыт";
  };

  const getReviewStatusClass = (s: Review["status"]) => {
    if (s === "pending")
      return "bg-amber-400/20 text-amber-100 border-amber-300/70";
    if (s === "approved")
      return "bg-emerald-400/20 text-emerald-100 border-emerald-300/70";
    return "bg-slate-500/40 text-slate-100 border-slate-300/70";
  };

  // ====== экшены ======

  const toggleUserBlocked = async (user: AdminUser) => {
    try {
      setBusyUserIds((prev) => [...prev, user.id]);
      const updated = await adminSetUserBlocked(user.id, !user.is_blocked);
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u))
      );
    } catch (e: any) {
      alert(e?.message ?? "Не удалось обновить статус пользователя");
    } finally {
      setBusyUserIds((prev) => prev.filter((id) => id !== user.id));
    }
  };

  const changeOrderStatus = async (
    order: AdminOrder,
    status: AdminOrderStatus
  ) => {
    try {
      setBusyOrderIds((prev) => [...prev, order.id]);
      const updated = await adminUpdateOrderStatus(order.id, status);
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? updated : o))
      );
    } catch (e: any) {
      alert(e?.message ?? "Не удалось обновить статус заказа");
    } finally {
      setBusyOrderIds((prev) => prev.filter((id) => id !== order.id));
    }
  };

  const changeTicketStatus = async (
    ticket: AdminSupportTicket,
    status: AdminSupportTicket["status"]
  ) => {
    try {
      setBusyTicketIds((prev) => [...prev, ticket.id]);
      const updated = await adminUpdateSupportTicketStatus(ticket.id, status);
      setTickets((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
    } catch (e: any) {
      alert(e?.message ?? "Не удалось обновить статус обращения");
    } finally {
      setBusyTicketIds((prev) => prev.filter((id) => id !== ticket.id));
    }
  };

  const changeReviewStatus = async (
    review: Review,
    status: Review["status"]
  ) => {
    try {
      setBusyReviewIds((prev) => [...prev, review.id]);
      const updated = await adminSetReviewStatus(review.id, status);
      setReviews((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    } catch (e: any) {
      alert(e?.message ?? "Не удалось обновить статус отзыва");
    } finally {
      setBusyReviewIds((prev) => prev.filter((id) => id !== review.id));
    }
  };

  // ====== рендер ======

  return (
    <Page>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black z-0" />
      <div
        className={`
          relative z-10 h-full flex flex-col px-4 pt-6 pb-6 gap-4
          text-white transition-all duration-500
          ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
        `}
      >
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold mb-1">Админ-панель</h1>
            <p className="text-[11px] text-slate-200/80">
              Управление пользователями, заказами, отзывами и обращениями.
            </p>
          </div>

          {stats && (
            <div className="flex flex-col items-end text-[10px] text-slate-200/80">
              <div>
                Пользователи:{" "}
                <span className="font-semibold">
                  {stats.total_users} (исп. {stats.total_executors}, зак.{" "}
                  {stats.total_customers})
                </span>
              </div>
              <div>
                Заказы:{" "}
                <span className="font-semibold">{stats.total_orders}</span> ·
                Отклики:{" "}
                <span className="font-semibold">{stats.total_responses}</span>
              </div>
            </div>
          )}
        </header>

        {/* табы */}
        <div className="flex gap-2 text-[11px]">
          {([
            ["users", "Пользователи"],
            ["orders", "Заказы"],
            ["reviews", "Отзывы"],
            ["support", "Поддержка"],
          ] as [AdminTab, string][]).map(([value, label]) => {
            const active = tab === value;
            return (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={`
                  px-3 py-1.5 rounded-2xl border text-xs flex-1
                  transition
                  ${
                    active
                      ? "bg-white/15 border-white/60 text-white"
                      : "bg-white/5 border-white/15 text-slate-200"
                  }
                `}
              >
                {label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-[13px] text-slate-100">
            Загружаем данные...
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-[13px] text-rose-300">
            {error}
          </div>
        ) : (
          <main className="flex-1 min-h-0">
            {tab === "users" && (
              <section className="h-full flex flex-col gap-3">
                <div className="flex items-center justify-between text-[11px] text-slate-200/80">
                  <span>
                    Всего: {users.length} · Заблокировано: {totalBlocked}
                  </span>
                </div>

                <div className="flex-1 overflow-auto space-y-2 pr-1">
                  {users.map((u) => {
                    const busy = busyUserIds.includes(u.id);
                    return (
                      <article
                        key={u.id}
                        className="
                          rounded-2xl bg-white/5 border border-white/15
                          px-3 py-2.5 text-[12px]
                        "
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div>
                            <div className="font-semibold">
                              {u.first_name} {u.last_name ?? ""}
                            </div>
                            <div className="text-[10px] text-slate-200/80">
                              {u.role === "executor"
                                ? "Исполнитель"
                                : u.role === "customer"
                                ? "Заказчик"
                                : "Админ"}
                              {u.city ? ` · ${u.city}` : ""}
                            </div>
                          </div>
                          <span
                            className={`
                              px-2 py-0.5 rounded-full text-[9px] border
                              ${
                                u.is_blocked
                                  ? "bg-rose-400/20 text-rose-100 border-rose-300/70"
                                  : "bg-emerald-400/20 text-emerald-100 border-emerald-300/70"
                              }
                            `}
                          >
                            {u.is_blocked ? "Заблокирован" : "Активен"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-1">
                          <div className="text-[10px] text-slate-200/80">
                            {u.phone ?? "Телефон не указан"}
                          </div>
                          {u.role !== "admin" && (
                            <Button
                              className="px-3 py-1.5 text-[11px]"
                              onClick={() => toggleUserBlocked(u)}
                              disabled={busy}
                            >
                              {busy
                                ? "Сохраняем..."
                                : u.is_blocked
                                ? "Разблокировать"
                                : "Заблокировать"}
                            </Button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {tab === "orders" && (
              <section className="h-full flex flex-col gap-3">
                <div className="text-[11px] text-slate-200/80">
                  Заказов: {orders.length}
                </div>
                <div className="flex-1 overflow-auto space-y-2 pr-1">
                  {orders.map((o) => {
                    const busy = busyOrderIds.includes(o.id);
                    return (
                      <article
                        key={o.id}
                        className="
                          rounded-2xl bg-white/5 border border-white/15
                          px-3 py-2.5 text-[12px]
                        "
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <div className="text-[10px] text-slate-200/80 mb-0.5">
                              Заказ #{o.id}
                            </div>
                            <div className="font-semibold">{o.title}</div>
                            <div className="text-[10px] text-slate-200/80">
                              {o.city}
                              {o.address ? ` · ${o.address}` : ""}
                            </div>
                          </div>
                          <span
                            className={`
                              px-2 py-0.5 rounded-full text-[9px] border
                              ${getOrderStatusClass(o.status)}
                            `}
                          >
                            {getOrderStatusLabel(o.status)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-2">
                          <div className="text-[10px] text-slate-200/80">
                            Клиент: #{o.customer_id}
                            {o.executor_id
                              ? ` · Исполнитель: #${o.executor_id}`
                              : " · Исполнитель не выбран"}
                          </div>
                          <div className="flex gap-1">
                            {(
                              ["active", "in_progress", "done", "cancelled"] as AdminOrderStatus[]
                            ).map((s) => (
                              <button
                                key={s}
                                disabled={busy || o.status === s}
                                onClick={() => changeOrderStatus(o, s)}
                                className={`
                                    px-2 py-0.5 rounded-full text-[9px] border
                                    ${
                                      o.status === s
                                        ? getOrderStatusClass(s)
                                        : "border-white/20 text-slate-200/80"
                                    }
                                  `}
                              >
                                {getOrderStatusLabel(s)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {tab === "reviews" && (
              <section className="h-full flex flex-col gap-3">
                <div className="text-[11px] text-slate-200/80">
                  Отзывов: {reviews.length}
                </div>
                <div className="flex-1 overflow-auto space-y-2 pr-1">
                  {reviews.map((r) => {
                    const busy = busyReviewIds.includes(r.id);
                    return (
                      <article
                        key={r.id}
                        className="
                          rounded-2xl bg-white/5 border border-white/15
                          px-3 py-2.5 text-[12px]
                        "
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <div className="text-[10px] text-slate-200/80 mb-0.5">
                              Отзыв #{r.id} · заказ #{r.order_id}
                            </div>
                            <div className="text-[11px]">
                              Оценка:{" "}
                              <span className="font-semibold">
                                {r.rating}
                              </span>{" "}
                              из 5
                            </div>
                            <p className="text-[11px] text-slate-100 mt-1 line-clamp-3">
                              {r.text}
                            </p>
                            <div className="text-[10px] text-slate-400 mt-1">
                              Автор: #{r.author_id} → Пользователь #
                              {r.target_user_id}
                            </div>
                          </div>
                          <span
                            className={`
                              px-2 py-0.5 rounded-full text-[9px] border
                              ${getReviewStatusClass(r.status)}
                            `}
                          >
                            {getReviewStatusLabel(r.status)}
                          </span>
                        </div>

                        <div className="flex gap-1 mt-2">
                          {(
                            ["pending", "approved", "hidden"] as Review["status"][]
                          ).map((s) => (
                            <button
                              key={s}
                              disabled={busy || r.status === s}
                              onClick={() => changeReviewStatus(r, s)}
                              className={`
                                  px-2 py-0.5 rounded-full text-[9px] border
                                  ${
                                    r.status === s
                                      ? getReviewStatusClass(s)
                                      : "border-white/20 text-slate-200/80"
                                  }
                                `}
                            >
                              {getReviewStatusLabel(s)}
                            </button>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {tab === "support" && (
              <section className="h-full flex flex-col gap-3">
                <div className="text-[11px] text-slate-200/80">
                  Обращений: {tickets.length}
                </div>
                <div className="flex-1 overflow-auto space-y-2 pr-1">
                  {tickets.map((t) => {
                    const busy = busyTicketIds.includes(t.id);
                    return (
                      <article
                        key={t.id}
                        className="
                          rounded-2xl bg-white/5 border border-white/15
                          px-3 py-2.5 text-[12px]
                        "
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <div className="text-[10px] text-slate-200/80 mb-0.5">
                              Тикет #{t.id} · пользователь #{t.user_id}
                            </div>
                            <div className="font-semibold line-clamp-1">
                              {t.topic}
                            </div>
                            <p className="text-[11px] text-slate-100 mt-1 line-clamp-3">
                              {t.message}
                            </p>
                            {t.user_name && (
                              <div className="text-[10px] text-slate-300 mt-1">
                                {t.user_name}
                                {t.user_phone
                                  ? ` · ${t.user_phone}`
                                  : ""}
                              </div>
                            )}
                          </div>
                          <span
                            className={`
                              px-2 py-0.5 rounded-full text-[9px] border
                              ${getTicketStatusClass(t.status)}
                            `}
                          >
                            {getTicketStatusLabel(t.status)}
                          </span>
                        </div>

                        <div className="flex gap-1 mt-2">
                          {(
                            ["open", "in_progress", "closed"] as AdminSupportTicket["status"][]
                          ).map((s) => (
                            <button
                              key={s}
                              disabled={busy || t.status === s}
                              onClick={() => changeTicketStatus(t, s)}
                              className={`
                                  px-2 py-0.5 rounded-full text-[9px] border
                                  ${
                                    t.status === s
                                      ? getTicketStatusClass(s)
                                      : "border-white/20 text-slate-200/80"
                                  }
                                `}
                            >
                              {getTicketStatusLabel(s)}
                            </button>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </main>
        )}
      </div>
    </Page>
  );
}