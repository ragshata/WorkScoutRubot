// src/pages/Orders/CreateOrder.tsx

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../../components/layout/Page";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";
import { createOrder, uploadOrderPhotos, type BudgetType } from "../../api/orders";
import { getUserFromStorage } from "../../api/users";

const CATEGORIES = [
  "Отделка",
  "Сантехника",
  "Электрика",
  "Кровля",
  "Фасад",
  "Черновые работы",
  "Окна и двери",
  "Полы",
];

const steps = [
  { key: "location", title: "Где и что делать" },
  { key: "details", title: "Что нужно сделать" },
  { key: "money", title: "Бюджет, сроки, фото" },
];

export default function CreateOrder() {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);
  const [step, setStep] = useState(0);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [budgetMode, setBudgetMode] = useState<BudgetType>("fixed");
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);

  const totalSteps = steps.length;

  // поля формы
  const [city, setCity] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [objectType, setObjectType] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // фото (1–3)
  const [photos, setPhotos] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setAnimate(true));
  }, []);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handlePhotosChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    // максимум 3, как обещали людям (и как бэк ждёт)
    setPhotos((prev) => [...prev, ...files].slice(0, 3));

    // чтобы можно было выбрать тот же файл снова (браузеры иногда не триггерят change)
    e.target.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // превью URL (и да, мы их чистим, потому что память тоже имеет чувства)
  const previewUrls = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  const handleNext = async () => {
    setError(null);

    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
      return;
    }

    await handleSubmit();
  };

  const handlePrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    // минимальная валидация по ТЗ
    if (!city.trim()) {
      setError("Укажи город");
      setStep(0);
      return;
    }

    if (selectedCategories.length === 0) {
      setError("Выбери хотя бы одну категорию работ");
      setStep(1);
      return;
    }

    if (!description.trim()) {
      setError("Добавь описание работ");
      setStep(1);
      return;
    }

    const currentUser = getUserFromStorage();
    if (!currentUser || currentUser.role !== "customer") {
      setError("Не найден профиль заказчика (нужно заново залогиниться)");
      return;
    }

    const numericBudget =
      budgetMode === "fixed"
        ? (() => {
            const cleaned = budget.replace(/[^\d]/g, "");
            return cleaned ? parseInt(cleaned, 10) : null;
          })()
        : null;

    const title =
      objectType.trim() ||
      (selectedCategories[0] ?? "").trim() ||
      "Строительный заказ";

    setSubmitting(true);
    try {
      // 1) создаём заказ
      const created = await createOrder({
        customer_id: currentUser.id, // фронту удобно, бэк игнорит
        title,
        description: description.trim(),
        city: city.trim(),
        address: address.trim() || null,
        categories: selectedCategories,
        budget_type: budgetMode,
        budget_amount: numericBudget ?? null,
        // ВАЖНО: как на бэке: start_date / end_date
        start_date: startDate || null,
        end_date: endDate || null,
      });

      // 2) если есть фото — грузим их отдельным запросом
      if (photos.length > 0) {
        try {
          await uploadOrderPhotos(created.id, photos);
        } catch (e) {
          // заказ уже создан, поэтому фото не должны ломать UX
          console.error(e);
        }
      }

      navigate("/customer/orders");
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Не удалось создать заказ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      {/* фон */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-800 via-blue-900 to-blue-950 z-0" />

      {/* шум */}
      <div
        className="absolute inset-0 z-0 opacity-[0.22]"
        style={{
          backgroundImage: "url('https://grainy-gradients.vercel.app/noise.png')",
          backgroundSize: "220%",
        }}
      />

      {/* свечение */}
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
        {/* заголовок + шаги */}
        <div className="mb-5 max-w-md w-full mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-blue-200/80">
                Создание заказа
              </div>
              <h1 className="text-lg font-semibold">{steps[step].title}</h1>
            </div>
            <div className="text-[11px] text-blue-100">
              Шаг {step + 1} из {totalSteps}
            </div>
          </div>

          {/* прогресс-бар */}
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-cyan-400/80"
              style={{
                width: `${((step + 1) / totalSteps) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Шаги */}
        <div className="flex-1 max-w-md w-full mx-auto flex flex-col gap-5 mt-2">
          {/* Шаг 1 — локация */}
          {step === 0 && (
            <section
              className="
                rounded-3xl bg-white/12 border border-white/25
                backdrop-blur-2xl p-5
                shadow-[0_0_30px_rgba(0,0,0,0.35)]
                space-y-4
              "
            >
              <p className="text-[11px] text-blue-100">
                Укажите город и адрес — так мы покажем заказ только
                подходящим исполнителям.
              </p>

              <Input
                label="Город"
                placeholder="Например: Москва"
                value={city}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setCity(e.target.value)
                }
              />
              <Input
                label="Адрес"
                placeholder="Улица, дом, подъезд (если нужно)"
                value={address}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setAddress(e.target.value)
                }
              />
              <Input
                label="Тип объекта"
                placeholder="Квартира, дом, офис и т.п."
                value={objectType}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setObjectType(e.target.value)
                }
              />
            </section>
          )}

          {/* Шаг 2 — категории + описание */}
          {step === 1 && (
            <>
              <section
                className="
                  rounded-3xl bg-white/12 border border-white/25
                  backdrop-blur-2xl p-5
                  shadow-[0_0_30px_rgba(0,0,0,0.35)]
                  space-y-3
                "
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-semibold">Категории работ</div>
                  <div className="text-[10px] text-blue-100">
                    Можно выбрать несколько
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCategorySheetOpen(true)}
                  className="
                    w-full rounded-2xl px-4 py-3
                    bg-white/10 border border-white/25
                    text-[12px] text-blue-50
                    flex items-center justify-between
                    active:scale-[0.97] transition
                  "
                >
                  <span>
                    {selectedCategories.length === 0
                      ? "Выбрать категории работ"
                      : `Выбрано: ${selectedCategories.length}`}
                  </span>
                  <span className="text-[16px]">▾</span>
                </button>

                {selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {selectedCategories.map((cat) => (
                      <span
                        key={cat}
                        className="
                          px-2.5 py-1 rounded-full text-[10px]
                          bg-cyan-500/25 border border-cyan-400/60
                          text-white
                        "
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <section
                className="
                  rounded-3xl bg-white/10 border border-white/20
                  backdrop-blur-2xl p-5
                  shadow-[0_0_26px_rgba(0,0,0,0.3)]
                  space-y-3
                "
              >
                <div className="text-sm font-semibold">Описание работ</div>
                <p className="text-[11px] text-blue-100">
                  Коротко опишите, что нужно сделать, в каком объёме
                  и какие есть нюансы.
                </p>

                <textarea
                  className="
                    mt-1 w-full min-h-[110px] rounded-2xl
                    bg-black/10 border border-white/20
                    px-3 py-2 text-[13px] text-white
                    placeholder:text-blue-200/70
                    outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60
                  "
                  value={description}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Например: нужно выровнять стены под покраску в комнате 18 м², демонтировать старые обои..."
                />
              </section>
            </>
          )}

          {/* Шаг 3 — деньги, сроки, фото */}
          {step === 2 && (
            <>
              <section
                className="
                  rounded-3xl bg-white/12 border border-white/25
                  backdrop-blur-2xl p-5
                  shadow-[0_0_30px_rgba(0,0,0,0.35)]
                  space-y-3
                "
              >
                <div className="text-sm font-semibold mb-1">Бюджет</div>

                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setBudgetMode("fixed")}
                    className={`
                      flex-1 px-3 py-2 rounded-2xl text-[11px]
                      border backdrop-blur-xl
                      transition-all active:scale-[0.97]
                      ${
                        budgetMode === "fixed"
                          ? "bg-white/20 border-white text-white"
                          : "bg-white/5 border-white/20 text-blue-100"
                      }
                    `}
                  >
                    Фиксированная сумма
                  </button>
                  <button
                    type="button"
                    onClick={() => setBudgetMode("negotiable")}
                    className={`
                      flex-1 px-3 py-2 rounded-2xl text-[11px]
                      border backdrop-blur-xl
                      transition-all active:scale-[0.97]
                      ${
                        budgetMode === "negotiable"
                          ? "bg-white/20 border-white text-white"
                          : "bg-white/5 border-white/20 text-blue-100"
                      }
                    `}
                  >
                    Договорная
                  </button>
                </div>

                {budgetMode === "fixed" ? (
                  <Input
                    label="Сумма"
                    placeholder="Например: 30 000 ₽"
                    value={budget}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setBudget(e.target.value)
                    }
                  />
                ) : (
                  <p className="text-[11px] text-blue-100">
                    Бюджет договорной — исполнители предложат свою цену
                    в откликах.
                  </p>
                )}
              </section>

              <section
                className="
                  rounded-3xl bg-white/10 border border-white/20
                  backdrop-blur-2xl p-5
                  shadow-[0_0_26px_rgba(0,0,0,0.3)]
                  space-y-3
                "
              >
                <div className="text-sm font-semibold">Сроки</div>
                <p className="text-[11px] text-blue-100">
                  Можно указать примерные даты — это поможет отфильтровать
                  неподходящие отклики.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Начать с"
                    type="date"
                    value={startDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setStartDate(e.target.value)
                    }
                  />
                  <Input
                    label="Завершить до"
                    type="date"
                    value={endDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setEndDate(e.target.value)
                    }
                  />
                </div>
              </section>

              <section
                className="
                  rounded-3xl bg-white/6 border border-white/15
                  backdrop-blur-2xl p-5
                  shadow-[0_0_20px_rgba(0,0,0,0.25)]
                  space-y-3
                "
              >
                <div className="text-sm font-semibold">Фото (необязательно)</div>
                <p className="text-[11px] text-blue-100 mb-2">
                  Добавьте 1–3 фото, чтобы исполнители лучше понимали
                  объём и состояние объекта.
                </p>

                <label
                  htmlFor="photos"
                  className="
                    mt-1 w-full rounded-2xl border border-dashed border-white/35
                    bg-white/5 px-4 py-6
                    flex flex-col items-center justify-center
                    text-[11px] text-blue-100
                    cursor-pointer
                    hover:bg-white/10 transition
                  "
                >
                  <div className="text-3xl mb-1">📷</div>
                  <div>
                    {photos.length === 0 ? "Нажмите, чтобы выбрать фото" : `Выбрано фото: ${photos.length}/3`}
                  </div>
                  <div className="text-[10px] text-blue-200/80 mt-1">
                    jpg / png / webp · до 8MB
                  </div>
                </label>
                <input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotosChange}
                />

                {photos.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {previewUrls.map((url, idx) => (
                      <div
                        key={url}
                        className="relative rounded-xl overflow-hidden border border-white/20"
                      >
                        <img
                          src={url}
                          alt="Фото"
                          className="w-full h-20 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 bg-black/55 text-white text-[10px] px-2 py-1 rounded-lg"
                          disabled={submitting}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* Ошибка */}
          {error && (
            <div className="text-center text-red-200 text-xs mt-1">
              {error}
            </div>
          )}

          {/* нижняя панель управления шагами */}
          <div className="mt-6 sticky bottom-4 left-0 right-0">
            {step === 0 ? (
              <div
                className="
                  rounded-2xl bg-blue-950/85 border border-white/15
                  backdrop-blur-2xl px-4 py-3
                "
              >
                <Button
                  className="w-full text-[13px]"
                  onClick={handleNext}
                  disabled={submitting}
                >
                  {submitting ? "Сохраняю..." : "Дальше"}
                </Button>
              </div>
            ) : (
              <div
                className="
                  rounded-2xl bg-blue-950/85 border border-white/15
                  backdrop-blur-2xl px-4 py-3
                  flex items-center gap-3
                "
              >
                <button
                  type="button"
                  onClick={handlePrev}
                  className="
                    px-4 py-2 rounded-xl text-[12px]
                    bg-white/5 border border-white/20
                    text-blue-100
                    active:scale-[0.97] transition
                  "
                  disabled={submitting}
                >
                  Назад
                </button>

                <Button
                  className="flex-1 text-[13px]"
                  onClick={handleNext}
                  disabled={submitting}
                >
                  {submitting
                    ? "Публикую..."
                    : step === totalSteps - 1
                    ? "Опубликовать заказ"
                    : "Дальше"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BottomSheet для категорий */}
      <BottomSheet
        open={isCategorySheetOpen}
        onClose={() => setIsCategorySheetOpen(false)}
      >
        <div className="pt-3 pb-6 px-5">
          <div className="w-10 h-1 rounded-full bg-white/30 mx-auto mb-4" />

          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-white">
                Категории работ
              </div>
              <div className="text-[11px] text-blue-100">
                Можно выбрать несколько специализаций
              </div>
            </div>
            {selectedCategories.length > 0 && (
              <div className="text-[11px] text-blue-100">
                Выбрано: {selectedCategories.length}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {CATEGORIES.map((cat) => {
              const active = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`
                    px-3 py-1.5 rounded-full text-[11px]
                    border backdrop-blur-xl
                    transition-all duration-150 active:scale-[0.97]
                    ${
                      active
                        ? "bg-cyan-500/30 border-cyan-400 text-white"
                        : "bg-white/5 border-white/20 text-blue-100"
                    }
                  `}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <Button
            className="w-full text-[13px]"
            onClick={() => setIsCategorySheetOpen(false)}
          >
            Готово
          </Button>
        </div>
      </BottomSheet>
    </Page>
  );
}
