import { useNavigate } from "react-router-dom";
import Page from "../../components/layout/Page";
import Input from "../../components/ui/Input";
import BottomSheet from "../../components/ui/BottomSheet";
import { useEffect, useState, type ChangeEvent } from "react";

import WebApp from "@twa-dev/sdk";
import { registerUser } from "../../api/auth";
import { saveUserToStorage, type UserRole } from "../../api/users";


export default function RegisterExecutor() {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);

  // данные
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("+7 ");
  const [city, setCity] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [about, setAbout] = useState("");

  // bottom sheet
  const [sheetOpen, setSheetOpen] = useState(false);

  const skills = [
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

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    );
  };

  // авто +7
  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    if (!v.startsWith("+7")) v = "+7 ";
    setPhone(v);
  };

  useEffect(() => {
    requestAnimationFrame(() => setAnimate(true));
  }, []);

  const handleSubmit = async () => {
    setError(null);

    // базовая валидация по ТЗ
    if (!name.trim()) {
      setError("Укажи имя");
      return;
    }
    if (!phone.trim() || phone.trim().length < 4) {
      setError("Укажи телефон");
      return;
    }
    if (!city.trim()) {
      setError("Укажи город");
      return;
    }

    const years = Number(experienceYears.replace(/[^\d]/g, ""));
    if (!experienceYears.trim() || Number.isNaN(years) || years < 0) {
      setError("Укажи опыт в годах");
      return;
    }

    if (selectedSkills.length === 0) {
      setError("Выбери хотя бы одну специализацию");
      return;
    }

    setLoading(true);
    try {
      // берём реального юзера из Telegram WebApp, локально — мок
      const tgUser = WebApp.initDataUnsafe?.user;
      const telegramId =
        tgUser?.id ?? Math.floor(Math.random() * 10_000_000);

      const user = await registerUser({
        telegram_id: telegramId,
        role: "executor" as UserRole,
        first_name: name.trim(),
        last_name: surname.trim() || undefined,
        phone: phone.trim(),
        city: city.trim(),
        experience_years: years,          // уже очищенное число
        specializations: selectedSkills,  // МАССИВ
        portfolio_photos: null,
        about: about.trim() || null,
      });

      saveUserToStorage(user);

      // дальше по флоу — экран приветствия исполнителя
      navigate("/welcome/executor");
    } catch (e: any) {
      setError(e?.message ?? "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      {/* ФОНЫ */}
      <div className="absolute inset-0 bg-blue-700 z-0" />
      <div className="absolute inset-0 sand-bg z-0" />
      <div className="absolute inset-0 bg-white/10 backdrop-blur-xl z-0" />

      {/* КОНТЕНТ */}
      <div
        className={`
          relative z-10 max-w-md mx-auto px-4 py-10
          transition-all duration-700
          ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
        `}
      >
        <h1 className="text-3xl font-bold text-white text-center mb-8 drop-shadow">
          Регистрация исполнителя
        </h1>

        {/* Поля */}
        <div className="flex flex-col gap-5 mb-6">
          <Input
            label="Имя"
            placeholder="Введите имя"
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setName(e.target.value)
            }
          />

          <Input
            label="Фамилия"
            placeholder="Введите фамилию"
            value={surname}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setSurname(e.target.value)
            }
          />

          <Input
            label="Телефон"
            placeholder="+7"
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
          />

          <Input
            label="Город"
            placeholder="Где вы обычно работаете"
            value={city}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setCity(e.target.value)
            }
          />

          <Input
            label="Опыт (лет)"
            placeholder="Например: 3"
            type="number"
            value={experienceYears}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setExperienceYears(e.target.value)
            }
          />

          <Input
            label="О себе"
            placeholder="Кратко опишите ваши услуги"
            value={about}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setAbout(e.target.value)
            }
          />
        </div>

        {/* Кнопка выбора специализаций */}
        <button
          onClick={() => setSheetOpen(true)}
          className="
            w-full py-3 rounded-2xl 
            bg-white/25 border border-white/40 backdrop-blur-xl
            text-white font-semibold
            shadow-[0_0_18px_rgba(255,255,255,0.25)]
            hover:bg-white/30 active:scale-95
            transition
          "
        >
          Выбрать специализации
        </button>

        {/* показ выбранных */}
        {selectedSkills.length > 0 && (
          <div className="text-center text-blue-100 mt-3 text-sm">
            Выбрано: {selectedSkills.join(", ")}
          </div>
        )}

        {/* ошибка */}
        {error && (
          <div className="mt-4 text-center text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* КНОПКА ПРОДОЛЖИТЬ */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`
            w-full mt-8 py-3 rounded-2xl
            bg-blue-500/80 
            border border-white/40
            text-white font-semibold 
            shadow-[0_0_25px_rgba(0,140,255,0.8)]
            hover:bg-blue-500/90
            active:scale-95
            transition
            ${loading ? "opacity-70" : ""}
          `}
        >
          {loading ? "Сохраняю..." : "Продолжить"}
        </button>
      </div>

      {/* ===================== BOTTOM SHEET ===================== */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <div className="p-5">
          <h2 className="text-xl font-bold text-white text-center mb-4 drop-shadow">
            Выберите специализации
          </h2>

          <div className="flex flex-col gap-3">
            {skills.map((s) => {
              const active = selectedSkills.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleSkill(s)}
                  className={`
                    w-full py-3 rounded-xl border backdrop-blur-xl text-left px-4
                    transition-all duration-300
                    ${
                      active
                        ? "bg-blue-500/60 border-blue-300 text-white shadow-[0_0_15px_rgba(0,150,255,0.6)]"
                        : "bg-white/20 border-white/30 text-blue-200 hover:bg-white/30"
                    }
                  `}
                >
                  {s}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setSheetOpen(false)}
            className="
              w-full mt-6 py-3 rounded-2xl 
              bg-white/20 border border-white/30 backdrop-blur-xl
              text-white font-semibold hover:bg-white/30
              transition
            "
          >
            Готово
          </button>
        </div>
      </BottomSheet>
    </Page>
  );
}
