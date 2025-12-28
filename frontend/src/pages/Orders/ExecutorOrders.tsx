import { type FormEvent, useEffect, useMemo, useState } from "react";
import Page from "../../components/layout/Page";
import Button from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";
import { getAvailableOrders, type AvailableOrderDto } from "../../api/orders";
import { sendOrderResponse } from "../../api/responses";

type SortMode = "recent" | "budget" | "deadline";

type Order = {
  id: string;
  title: string;
  categories: string[];
  city: string;
  address: string;
  budgetLabel: string;
  budgetValue: number | null;
  dates: string;
  description: string;
  hasPhotos: boolean;
  photos: string[]; // ✅ новое
  createdAt: number;
  deadlineWeight: number;
};

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "recent", label: "Свежие" },
  { key: "budget", label: "Бюджет" },
  { key: "deadline", label: "Сроки" },
];

const DEFAULT_CATEGORIES = [
  "Отделка",
  "Сантехника",
  "Электрика",
  "Кровля",
  "Фасад",
  "Черновые работы",
  "Окна и двери",
  "Полы",
];

// --------- хелперы форматирования ---------

function formatDateShort(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

function formatDates(from: string | null, to: string | null): string {
  const f = formatDateShort(from);
  const t = formatDateShort(to);

  if (f && t) return `${f} — ${t}`;
  if (f) return `с ${f}`;
  if (t) return `до ${t}`;
  return "Сроки не указаны";
}

function mapApiOrder(dto: AvailableOrderDto): Order {
  const isNegotiable = dto.budget_type === "negotiable";
  const budgetValue =
    !isNegotiable && dto.budget_amount != null ? dto.budget_amount : null;

  const budgetLabel = isNegotiable
    ? "Договорная"
    : dto.budget_amount != null
    ? `${new Intl.NumberFormat("ru-RU").format(dto.budget_amount)} ₽`
    : "Не указано";

  const createdAt = Date.parse(dto.created_at);
  const deadlineTs = dto.date_to ? Date.parse(dto.date_to) : NaN;

  // ✅ фотки: бэк теперь может отдавать photos, но тип на фронте мог ещё не обновиться
  const photos = Array.isArray((dto as any).photos) ? ((dto as any).photos as string[]) : [];

  return {
    id: String(dto.id),
    title: dto.title,
    categories: dto.categories ?? [],
    city: dto.city,
    address: dto.address,
    budgetLabel,
    budgetValue,
    dates: formatDates(dto.date_from, dto.date_to),
    description: dto.description,
    hasPhotos: photos.length > 0 || !!dto.has_photos,
    photos,
    createdAt: Number.isNaN(createdAt) ? Date.now() : createdAt,
    deadlineWeight: Number.isNaN(deadlineTs)
      ? Number.MAX_SAFE_INTEGER
      : deadlineTs,
  };
}

/* ---------- МОДАЛКА ПОДРОБНЕЕ ---------- */

function OrderDetailsModal({
  open,
  order,
  onClose,
  onReply,
}: {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onReply: () => void;
}) {
  if (!open || !order) return null;

  const cover = order.photos?.[0] ?? null;

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
                Заказ · #{order.id}
              </div>
              <div className="text-[15px] font-semibold leading-snug">
                {order.title}
              </div>
            </div>
            <div className="text-right text-[11px] text-blue-100">
              {order.city}
              <div className="text-[10px] text-blue-300/80">{order.address}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {order.categories.map((cat) => (
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
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3 text-[12px]">
            <div>
              <div className="text-blue-200/80 text-[11px]">Бюджет</div>
              <div className="text-white font-medium">{order.budgetLabel}</div>
            </div>
            <div>
              <div className="text-blue-200/80 text-[11px]">Сроки</div>
              <div className="text-blue-50">{order.dates}</div>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <p className="flex-1 text-[12px] text-blue-100 leading-snug">
              {order.description}
            </p>

            <div
              className="
                w-[84px] h-[84px] rounded-2xl overflow-hidden
                bg-gradient-to-br from-blue-500/50 via-cyan-400/60 to-blue-800/80
                border border-white/20 flex items-center justify-center
                text-[11px] text-white/90 text-center
              "
            >
              {cover ? (
                <img
                  src={cover}
                  alt="Фото заказа"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="px-2">Без фото</span>
              )}
            </div>
          </div>

          <div
            className="
              mb-4 rounded-2xl bg-black/20 border border-white/10
              px-3 py-2.5 text-[11px] text-blue-200/90
            "
          >
            После отклика заказчик увидит ваше предложение и сообщение. Отклик
            появится в разделе <span className="font-semibold">«Мои отклики»</span>.
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 text-[13px] py-2.5"
              onClick={onReply}
              type="button"
            >
              Откликнуться
            </Button>
            <button
              type="button"
              className="
                flex-1 px-3 py-2.5 rounded-2xl text-[12px]
                bg-white/8 border border-white/22
                text-blue-50
                active:scale-[0.97] transition
              "
              onClick={onClose}
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------ СТРАНИЦА ------------------------ */

export default function ExecutorOrders() {
  const [animate, setAnimate] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [catSheetOpen, setCatSheetOpen] = useState(false);

  const [replyOrder, setReplyOrder] = useState<Order | null>(null);
  const [price, setPrice] = useState("");
  const [discussPrice, setDiscussPrice] = useState(false);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setAnimate(true));

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const api = await getAvailableOrders();
        if (cancelled) return;
        const mapped = api.map(mapApiOrder);
        setOrders(mapped);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("Не удалось загрузить заказы. Попробуйте обновить позже.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const cities = useMemo(
    () =>
      Array.from(
        new Set(orders.map((o) => o.city).filter((c) => c && c.trim() !== ""))
      ).sort(),
    [orders]
  );

  const allCategories = useMemo(() => {
    const fromOrders = Array.from(
      new Set(orders.flatMap((o) => o.categories ?? []))
    ).sort();

    return fromOrders.length > 0 ? fromOrders : DEFAULT_CATEGORIES;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = [...orders];

    if (cityFilter) {
      list = list.filter((o) => o.city === cityFilter);
    }

    if (selectedCategories.length > 0) {
      list = list.filter((o) =>
        selectedCategories.some((cat) => o.categories.includes(cat))
      );
    }

    list.sort((a, b) => {
      if (sortMode === "recent") return b.createdAt - a.createdAt;
      if (sortMode === "budget") {
        const av = a.budgetValue ?? 0;
        const bv = b.budgetValue ?? 0;
        return bv - av;
      }
      return a.deadlineWeight - b.deadlineWeight;
    });

    return list;
  }, [orders, cityFilter, selectedCategories, sortMode]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const openReply = (order: Order) => {
    setReplyOrder(order);
    setPrice("");
    setDiscussPrice(false);
    setComment("");
  };

  const closeReply = () => {
    setReplyOrder(null);
  };

  const handleSubmitReply = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!replyOrder) return;

    const trimmedComment = comment.trim();
    const trimmedPrice = price.trim();

    if (!discussPrice && !trimmedPrice) return;
    if (trimmedComment.length < 3) return;

    const numericPrice =
      discussPrice || !trimmedPrice
        ? null
        : parseInt(trimmedPrice.replace(/\s/g, ""), 10) || null;

    setSending(true);

    try {
      await sendOrderResponse(Number(replyOrder.id), {
        price: numericPrice,
        discuss_price: discussPrice,
        comment: trimmedComment,
      });

      setReplyOrder(null);
      setToast("Отклик отправлен заказчику");
    } catch (err) {
      console.error(err);
      setToast("Не получилось отправить отклик. Попробуйте ещё раз.");
    } finally {
      setSending(false);
      setTimeout(() => setToast(null), 2300);
    }
  };

  const canSubmit =
    (discussPrice || price.trim() !== "") && comment.trim().length >= 3;

  return (
    <Page>
      {/* ФОН */}
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
            bg-emerald-500/90 text-white text-[12px]
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
        {/* ХЕДЕР */}
        <div className="max-w-md w-full mx-auto mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-blue-200/80">
                WorkScout · Исполнитель
              </div>
              <h1 className="text-xl font-semibold">Доступные заказы</h1>
            </div>
            <div className="text-[11px] text-blue-100">
              {loading ? "Загрузка..." : `${filteredOrders.length} найдено`}
            </div>
          </div>

          {/* ФИЛЬТРЫ */}
          <div className="mt-3 space-y-3 text-[11px] text-blue-100">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCitySheetOpen(true)}
                className="
                  flex-1 px-3 py-2 rounded-2xl border
                  bg-white/10 border-white/25
                  text-[11px] text-blue-50 text-left
                  active:scale-[0.97] transition
                "
              >
                <div className="text-[10px] text-blue-200/80 mb-0.5">Город</div>
                <div className="text-[12px] font-medium">
                  {cityFilter ?? "Все города"}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCatSheetOpen(true)}
                className="
                  flex-1 px-3 py-2 rounded-2xl border
                  bg-white/10 border-white/25
                  text-[11px] text-blue-50 text-left
                  active:scale-[0.97] transition
                "
              >
                <div className="text-[10px] text-blue-200/80 mb-0.5">
                  Категории
                </div>
                <div className="text-[12px] font-medium truncate">
                  {selectedCategories.length === 0
                    ? "Все работы"
                    : selectedCategories.join(", ")}
                </div>
              </button>
            </div>

            <div>
              <div className="mb-1">Сортировка</div>
              <div className="flex gap-2">
                {SORT_OPTIONS.map((opt) => {
                  const active = opt.key === sortMode;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSortMode(opt.key)}
                      className={`
                        flex-1 px-3 py-1.5 rounded-2xl border text-[11px]
                        ${
                          active
                            ? "bg-white text-blue-900 border-white shadow-[0_0_18px_rgba(255,255,255,0.4)] font-medium"
                            : "bg-white/10 border-white/25 text-blue-100"
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* СПИСОК ЗАКАЗОВ */}
        <div className="flex-1 max-w-md w-full mx-auto space-y-3 pb-4">
          {error && (
            <div
              className="
                mt-4 rounded-3xl bg-red-500/15 border border-red-400/60
                px-4 py-3 text-[12px] text-red-50
              "
            >
              {error}
            </div>
          )}

          {!loading && !error && filteredOrders.length === 0 && (
            <div
              className="
                mt-6 rounded-3xl bg-white/10 border border-white/15
                backdrop-blur-2xl px-4 py-6 text-center text-sm text-blue-100
              "
            >
              Под ваши фильтры сейчас ничего нет. Попробуйте расширить город или
              категории.
            </div>
          )}

          {filteredOrders.map((order) => {
            const cover = order.photos?.[0] ?? null;

            return (
              <article
                key={order.id}
                className="
                  rounded-3xl bg-white/12 border border-white/20
                  backdrop-blur-2xl p-4
                  shadow-[0_0_30px_rgba(0,0,0,0.45)]
                  flex flex-col gap-3
                "
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {order.categories.map((cat) => (
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
                  <div className="text-[10px] text-blue-100 text-right">
                    {order.city}
                    <div className="text-[10px] text-blue-200/80">#{order.id}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold mb-1">{order.title}</div>
                  <div className="text-[11px] text-blue-100">{order.address}</div>
                </div>

                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <div className="flex flex-col">
                    <span className="text-blue-200/80">Бюджет</span>
                    <span className="text-[12px] font-medium text-white">
                      {order.budgetLabel}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-blue-200/80">Сроки</span>
                    <span className="text-[12px] text-blue-50">{order.dates}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <p className="flex-1 text-[12px] text-blue-100 leading-snug">
                    {order.description}
                  </p>

                  <div
                    className="
                      w-[64px] h-[64px] rounded-2xl overflow-hidden
                      bg-gradient-to-br from-blue-500/50 via-cyan-400/60 to-blue-800/80
                      border border-white/20 flex items-center justify-center
                      text-[11px] text-white/90
                    "
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt="Фото заказа"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span>Без фото</span>
                    )}
                  </div>
                </div>

                <div className="mt-2 space-y-2">
                  <Button
                    className="w-full text-[13px] py-2.5"
                    onClick={() => openReply(order)}
                  >
                    Откликнуться
                  </Button>

                  <button
                    type="button"
                    className="
                      w-full px-3 py-2.5 rounded-2xl text-[12px]
                      bg-white/6 border border-white/22
                      text-blue-50
                      active:scale-[0.97] transition
                    "
                    onClick={() => {
                      setSelectedOrder(order);
                      setDetailsOpen(true);
                    }}
                  >
                    Подробнее
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* МОДАЛКА ГОРОДА */}
      <BottomSheet open={citySheetOpen} onClose={() => setCitySheetOpen(false)}>
        <div className="px-4 pt-3 pb-5 text-white">
          <div className="w-10 h-1 rounded-full bg-white/40 mx-auto mb-3" />
          <div className="text-[13px] font-semibold mb-2">Выберите город</div>

          <button
            type="button"
            className={`
              w-full text-left px-3 py-2 rounded-2xl mb-1.5 text-[13px]
              ${!cityFilter ? "bg-white text-blue-900" : "bg-white/8 text-blue-50"}
            `}
            onClick={() => {
              setCityFilter(null);
              setCitySheetOpen(false);
            }}
          >
            Все города
          </button>

          {cities.length === 0 && (
            <div className="mt-2 mb-2 text-[11px] text-blue-200/80">
              Пока нет городов в доступных заказах — фильтр по городу недоступен.
            </div>
          )}

          {cities.map((city) => (
            <button
              key={city}
              type="button"
              className={`
                w-full text-left px-3 py-2 rounded-2xl mb-1.5 text-[13px]
                ${cityFilter === city ? "bg-white text-blue-900" : "bg-white/8 text-blue-50"}
              `}
              onClick={() => {
                setCityFilter(city);
                setCitySheetOpen(false);
              }}
            >
              {city}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* МОДАЛКА КАТЕГОРИЙ */}
      <BottomSheet open={catSheetOpen} onClose={() => setCatSheetOpen(false)}>
        <div className="px-4 pt-3 pb-5 text-white">
          <div className="w-10 h-1 rounded-full bg-white/40 mx-auto mb-3" />
          <div className="text-[13px] font-semibold mb-2">Категории работ</div>

          <div className="flex flex-wrap gap-2 mb-4">
            {allCategories.map((cat) => {
              const active = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`
                    px-3 py-1.5 rounded-2xl text-[12px] border
                    ${
                      active
                        ? "bg-cyan-400 text-blue-950 border-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.7)]"
                        : "bg-white/5 border-white/25 text-blue-50"
                    }
                  `}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <Button
            className="w-full text-[13px] py-2.5"
            type="button"
            onClick={() => setCatSheetOpen(false)}
          >
            Готово
          </Button>
        </div>
      </BottomSheet>

      {/* BOTTOM-SHEET ОТКЛИКА */}
      <BottomSheet open={!!replyOrder} onClose={closeReply}>
        <form onSubmit={handleSubmitReply} className="px-4 pt-3 pb-5 text-white">
          <div className="w-10 h-1 rounded-full bg-white/40 mx-auto mb-3" />

          {replyOrder && (
            <>
              <div className="mb-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-blue-200/80 mb-1">
                  Отклик на заказ
                </div>
                <div className="text-[14px] font-semibold leading-snug mb-1">
                  {replyOrder.title}
                </div>
                <div className="text-[11px] text-blue-100">
                  {replyOrder.city} · {replyOrder.address}
                </div>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-blue-100">Ваша цена, ₽</span>
                  <span className="text-[10px] text-blue-200/80">
                    или отметьте «готов обсудить»
                  </span>
                </div>

                <input
                  type="number"
                  inputMode="numeric"
                  className={`
                    w-full rounded-2xl bg-white/10 border border-white/25
                    px-3 py-2.5 text-[13px] text-white
                    outline-none placeholder:text-blue-200/60
                    [appearance:textfield]
                    [&::-webkit-outer-spin-button]:appearance-none
                    [&::-webkit-inner-spin-button]:appearance-none
                    ${discussPrice ? "opacity-60 cursor-not-allowed" : "opacity-100"}
                  `}
                  placeholder="Например, 30000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={discussPrice}
                />

                <button
                  type="button"
                  onClick={() => setDiscussPrice((v) => !v)}
                  className={`
                    mt-2 inline-flex items-center gap-2 rounded-2xl px-3 py-2
                    text-[11px] border
                    ${
                      discussPrice
                        ? "bg-emerald-500/20 border-emerald-300 text-emerald-50"
                        : "bg-white/5 border-white/20 text-blue-100"
                    }
                  `}
                >
                  <span
                    className={`
                      w-4 h-4 rounded-full border flex items-center justify-center
                      ${discussPrice ? "border-emerald-200 bg-emerald-400" : "border-blue-200"}
                    `}
                  >
                    {discussPrice && <span className="w-2 h-2 rounded-full bg-emerald-950" />}
                  </span>
                  Готов обсудить цену
                </button>
              </div>

              <div className="mb-3">
                <div className="mb-1 text-[11px] text-blue-100">Комментарий к отклику</div>
                <textarea
                  rows={3}
                  className="
                    w-full rounded-2xl bg-white/10 border border-white/25
                    px-3 py-2.5 text-[13px] text-white
                    outline-none resize-none
                    placeholder:text-blue-200/60
                  "
                  placeholder="Коротко опишите, как будете выполнять работу"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div className="mb-3 text-[10px] text-blue-200/80">
                После отправки отклик попадёт в раздел{" "}
                <span className="font-semibold text-blue-50">«Мои отклики»</span>, а заказчик получит уведомление в Telegram.
              </div>

              <Button
                type="submit"
                disabled={sending || !canSubmit}
                className={`w-full text-[13px] py-2.5 ${sending || !canSubmit ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {sending ? "Отправляем..." : "Отправить отклик"}
              </Button>
            </>
          )}
        </form>
      </BottomSheet>

      <OrderDetailsModal
        open={detailsOpen}
        order={selectedOrder}
        onClose={() => setDetailsOpen(false)}
        onReply={() => {
          if (selectedOrder) openReply(selectedOrder);
          setDetailsOpen(false);
        }}
      />
    </Page>
  );
}
