import { useEffect, useState, type ChangeEvent } from "react";
import { useLocation } from "react-router-dom";
import Page from "../../components/layout/Page";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";
import { getMe, updateMe, type UserDto } from "../../api/users";

type CustomerStatus = "person" | "ip" | "ooo";

const CUSTOMER_STATUS_LABEL: Record<CustomerStatus, string> = {
  person: "Физлицо",
  ip: "ИП",
  ooo: "ООО",
};

// те же навыки, что и на экране регистрации исполнителя
const EXECUTOR_SKILLS = [
  "Строительство",
  "Ремонт",
  "Доставка",
  "Курьер",
  "Грузчик",
  "Сантехник",
  "Электрик",
  "Разнорабочий",
  "Сварщик",
  "Столяр",
  "Электромонтаж",
  "Клининг",
  "Монтажник",
];

function statusFromBackend(value?: string | null): CustomerStatus {
  if (!value) return "person";
  const v = value.toLowerCase();
  if (v.includes("ип")) return "ip";
  if (v.includes("ооо")) return "ooo";
  return "person";
}

// Расширяем UserDto мягко, чтобы фронт не падал, пока бэк не готов.
type UserWithStats = UserDto & {
  avatar_url?: string | null;
  photo_url?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  orders_completed_count?: number | null;
  orders_created_count?: number | null;
  orders_count?: number | null; // оставим как возможное реальное поле
};

export default function Profile() {
  const location = useLocation();
  const [animate, setAnimate] = useState(false);

  const [user, setUser] = useState<UserWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // общие поля
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("+7 ");

  // executor-specific
  const [about, setAbout] = useState("");
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [isSpecsSheetOpen, setIsSpecsSheetOpen] = useState(false);

  // customer-specific
  const [customerStatus, setCustomerStatus] =
    useState<CustomerStatus>("person");
  const [aboutOrders, setAboutOrders] = useState("");
  const [isStatusSheetOpen, setIsStatusSheetOpen] = useState(false);

  // роль: берём из ответа бэка, а если ещё не пришло — из URL
  const pathExecutor = location.pathname.includes("/executor");
  const isExecutor =
    (user?.role ?? (pathExecutor ? "executor" : "customer")) === "executor";
  const roleLabel = isExecutor ? "Исполнитель" : "Заказчик";

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    if (!v.startsWith("+7")) v = "+7 ";
    setPhone(v);
  };

  useEffect(() => {
    requestAnimationFrame(() => setAnimate(true));

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const me = (await getMe()) as UserWithStats;
        if (cancelled) return;

        setUser(me);

        const fullName = [me.first_name, me.last_name].filter(Boolean).join(" ");
        setName(fullName || "");
        setCity(me.city ?? "");
        setPhone(me.phone ?? "+7 ");

        if (me.role === "executor") {
          setSelectedSpecs(me.specializations ?? []);
          setAbout(me.about ?? "");
        } else {
          setCustomerStatus(statusFromBackend(me.company_name));
          setAboutOrders(me.about_orders ?? "");
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Не удалось загрузить профиль");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const toggleSpec = (spec: string) => {
    setSelectedSpecs((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const handleSave = async () => {
    if (!user) return;

    const trimmedName = name.trim();
    const [first, ...rest] = trimmedName.split(" ");
    const last = rest.join(" ") || null;

    const payload: any = {
      first_name: first || user.first_name,
      last_name: last,
      city: city.trim() || null,
      phone: phone.trim() || null,
    };

    if (isExecutor) {
      payload.about = about.trim() || null;
      payload.specializations = selectedSpecs;
    } else {
      payload.company_name = CUSTOMER_STATUS_LABEL[customerStatus];
      payload.about_orders = aboutOrders.trim() || null;
    }

    try {
      setSaving(true);
      setError(null);
      const updated = (await updateMe(payload)) as UserWithStats;
      setUser(updated);

      // слегка обновим localStorage, чтобы имя в других местах было свежим
      try {
        const stored = localStorage.getItem("rp_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          localStorage.setItem(
            "rp_user",
            JSON.stringify({
              ...parsed,
              id: updated.id,
              role: updated.role,
              first_name: updated.first_name,
              last_name: updated.last_name,
            })
          );
        }
      } catch {
        // игнор
      }

      setToast("Профиль сохранён");
      setTimeout(() => setToast(null), 2200);
    } catch (e) {
      console.error(e);
      setError("Не получилось сохранить изменения. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = name.trim().length >= 2 && phone.trim().length >= 4;

  // Без мокапов: показываем реальные данные или "—"
  const displayName = name.trim() ? name.trim() : "—";

  const rating = typeof user?.rating === "number" ? user.rating : null;
  const reviewsCount =
    typeof user?.reviews_count === "number" ? user.reviews_count : null;

  const ordersCompletedCount =
    typeof user?.orders_completed_count === "number"
      ? user.orders_completed_count
      : typeof user?.orders_count === "number"
      ? user.orders_count
      : null;

  const ordersCreatedCount =
    typeof user?.orders_created_count === "number"
      ? user.orders_created_count
      : typeof user?.orders_count === "number"
      ? user.orders_count
      : null;

  const avatarUrl =
    (typeof user?.avatar_url === "string" && user.avatar_url) ||
    (typeof user?.photo_url === "string" && user.photo_url) ||
    null;

  return (
    <Page>
      {/* тост */}
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

      {/* фон под Page */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-800 via-blue-900 to-blue-950 z-0" />

      {/* шум / текстура */}
      <div
        className="absolute inset-0 z-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.png')",
          backgroundSize: "220%",
        }}
      />

      {/* свечение сверху */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[260px] h-[260px] rounded-full bg-cyan-400/25 blur-3xl z-0" />

      {/* контент */}
      <div
        className={`
          relative z-10 flex flex-col px-5 pt-4 pb-8 min-h-screen
          text-white
          transition-all duration-600 ease-out
          ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
        `}
      >
        {/* заголовок без кнопки назад */}
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.16em] text-blue-200/80">
            WorkScout · профайл
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-lg font-semibold">Мой профиль</h1>
            <span className="px-2 py-[3px] rounded-full bg-white/10 border border-white/20 text-[10px] text-blue-100">
              {roleLabel}
            </span>
          </div>
        </div>

        <div className="flex-1 max-w-md w-full mx-auto flex flex-col gap-5">
          {/* ошибка */}
          {error && (
            <div className="rounded-2xl bg-red-500/15 border border-red-400/60 px-4 py-3 text-[12px] text-red-50">
              {error}
            </div>
          )}

          {/* если ещё грузится и нет данных */}
          {loading && !user ? (
            <div className="mt-8 text-center text-sm text-blue-100">
              Загружаем профиль...
            </div>
          ) : (
            <>
              {/* карточка с аватаром и статой */}
              <section
                className="
                  rounded-3xl bg-white/12 border border-white/25
                  backdrop-blur-2xl p-5
                  shadow-[0_0_30px_rgba(0,0,0,0.35)]
                  flex items-center gap-4
                "
              >
                <div className="w-14 h-14 rounded-full bg-white/20 overflow-hidden flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-3xl">{isExecutor ? "👷" : "🧑‍💼"}</div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="text-sm font-semibold">{displayName}</div>
                  <div className="text-[11px] text-blue-100">
                    {isExecutor
                      ? "Исполнитель · принимает заказы рядом"
                      : "Заказчик · публикует заказы в вашем городе"}
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-[11px] text-blue-100">
                    <span>
                      ⭐️ {rating !== null ? rating.toFixed(1) : "—"}
                      {reviewsCount !== null ? ` (${reviewsCount})` : ""}
                    </span>
                    <span className="w-[1px] h-3 bg-white/20" />
                    <span>
                      {isExecutor
                        ? ordersCompletedCount !== null
                          ? `${ordersCompletedCount} выполненных заказов`
                          : "— выполненных заказов"
                        : ordersCreatedCount !== null
                        ? `${ordersCreatedCount} созданных заказов`
                        : "— созданных заказов"}
                    </span>
                  </div>
                </div>
              </section>

              {/* основная форма */}
              <section
                className="
                  rounded-3xl bg-white/10 border border-white/20
                  backdrop-blur-2xl p-5
                  shadow-[0_0_26px_rgba(0,0,0,0.3)]
                  space-y-4
                "
              >
                <div className="text-sm font-semibold mb-1">Основные данные</div>

                <Input
                  label="Имя и фамилия"
                  placeholder="Как к вам обращаться"
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setName(e.target.value)
                  }
                />

                <Input
                  label="Телефон"
                  placeholder="+7 ___ ___-__-__"
                  value={phone}
                  onChange={handlePhoneChange}
                />

                {isExecutor ? (
                  <>
                    <Input
                      label="Город"
                      placeholder="Ваш город"
                      value={city}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setCity(e.target.value)
                      }
                    />

                    {selectedSpecs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedSpecs.map((s) => (
                          <span
                            key={s}
                            className="
                              px-2 py-[3px] rounded-full text-[11px]
                              bg-cyan-500/25 border border-cyan-400/70
                            "
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <Input
                      label="О себе"
                      placeholder="Кратко опишите опыт, инструменты, с чем обычно работаете"
                      value={about}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setAbout(e.target.value)
                      }
                    />

                    {/* Кнопка выбора специализаций */}
                    <button
                      type="button"
                      onClick={() => setIsSpecsSheetOpen(true)}
                      className="
                        w-full mt-2 py-3 rounded-2xl 
                        bg-white/15 border border-white/30 backdrop-blur-xl
                        text-white text-[13px] font-semibold
                        hover:bg-white/25 active:scale-95 transition
                      "
                    >
                      Специализации
                    </button>
                  </>
                ) : (
                  <>
                    {/* Статус заказчика */}
                    <button
                      type="button"
                      onClick={() => setIsStatusSheetOpen(true)}
                      className="
                        w-full mt-2 py-3 rounded-2xl 
                        bg-white/15 border border-white/30 backdrop-blur-xl
                        text-white text-[13px] font-semibold
                        hover:bg-white/25 active:scale-95 transition
                      "
                    >
                      Статус: {CUSTOMER_STATUS_LABEL[customerStatus]}
                    </button>

                    <Input
                      label="О заказах"
                      placeholder="Какие задачи обычно размещаете, какой формат работы удобен"
                      value={aboutOrders}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setAboutOrders(e.target.value)
                      }
                    />
                  </>
                )}

                <div className="pt-2">
                  <Button
                    className="w-full"
                    onClick={handleSave}
                    disabled={saving || !canSave}
                  >
                    {saving ? "Сохраняем..." : "Сохранить изменения"}
                  </Button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* BottomSheet статуса заказчика */}
      {!isExecutor && (
        <BottomSheet
          open={isStatusSheetOpen}
          onClose={() => setIsStatusSheetOpen(false)}
        >
          <div className="p-5">
            <div className="w-10 h-1 rounded-full bg-white/30 mx-auto mb-4" />
            <h2 className="text-sm font-semibold mb-3 text-white">
              Выберите статус
            </h2>

            <div className="flex flex-col gap-2">
              {(["person", "ip", "ooo"] as CustomerStatus[]).map((st) => {
                const active = customerStatus === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setCustomerStatus(st);
                      setIsStatusSheetOpen(false);
                    }}
                    className={`
                      w-full py-2.5 rounded-xl border backdrop-blur-xl text-left px-4 text-[13px]
                      ${
                        active
                          ? "bg-blue-500/70 border-blue-300 text-white shadow-[0_0_15px_rgba(0,150,255,0.6)]"
                          : "bg-white/10 border-white/25 text-blue-100 hover:bg-white/20"
                      }
                    `}
                  >
                    {CUSTOMER_STATUS_LABEL[st]}
                  </button>
                );
              })}
            </div>

            <Button
              className="w-full mt-4 text-[13px]"
              onClick={() => setIsStatusSheetOpen(false)}
            >
              Готово
            </Button>
          </div>
        </BottomSheet>
      )}

      {/* BottomSheet специализаций исполнителя */}
      {isExecutor && (
        <BottomSheet
          open={isSpecsSheetOpen}
          onClose={() => setIsSpecsSheetOpen(false)}
        >
          <div className="p-5">
            <div className="w-10 h-1 rounded-full bg-white/30 mx-auto mb-4" />
            <h2 className="text-sm font-semibold mb-3 text-white">
              Специализации
            </h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {EXECUTOR_SKILLS.map((s) => {
                const active = selectedSpecs.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpec(s)}
                    className={`
                      px-3 py-1.5 rounded-full text-[11px]
                      border backdrop-blur-xl transition-all active:scale-95
                      ${
                        active
                          ? "bg-cyan-500/40 border-cyan-300 text-white shadow-[0_0_18px_rgba(34,211,238,0.6)]"
                          : "bg-white/5 border-white/25 text-blue-100"
                      }
                    `}
                  >
                    {s}
                  </button>
                );
              })}
            </div>

            <Button
              className="w-full text-[13px]"
              onClick={() => setIsSpecsSheetOpen(false)}
            >
              Готово
            </Button>
          </div>
        </BottomSheet>
      )}
    </Page>
  );
}
