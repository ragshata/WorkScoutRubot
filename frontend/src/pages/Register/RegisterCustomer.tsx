import { useNavigate } from "react-router-dom";
import Page from "../../components/layout/Page";
import Input from "../../components/ui/Input";
import BottomSheet from "../../components/ui/BottomSheet";
import { useEffect, useState, type ChangeEvent } from "react";

import WebApp from "@twa-dev/sdk";
import { registerUser } from "../../api/auth";
import { saveUserToStorage, type UserRole } from "../../api/users";


export default function RegisterCustomer() {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);

  // поля
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("+7 ");

  // тип заказчика
  const [sheetOpen, setSheetOpen] = useState(false);
  const [customerType, setCustomerType] = useState<"person" | "company" | null>(
    null
  );

  // доп. поля для компании (пока только в UI, в бэк не шлём — добавим позже в модель)
  const [companyName, setCompanyName] = useState("");
  const [inn, setInn] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // авто +7
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    if (!v.startsWith("+7")) v = "+7 ";
    setPhone(v);
  };

  useEffect(() => {
    requestAnimationFrame(() => setAnimate(true));
  }, []);

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Укажи имя");
      return;
    }

    if (!phone.trim() || phone.trim().length < 4) {
      setError("Укажи телефон");
      return;
    }

    if (!customerType) {
      setError("Выбери тип заказчика");
      return;
    }

    // если компания — можно добавить простую проверку
    if (customerType === "company") {
      if (!companyName.trim()) {
        setError("Укажи название компании");
        return;
      }
      if (!inn.trim()) {
        setError("Укажи ИНН");
        return;
      }
    }

    setLoading(true);
    try {
      const tgUser = WebApp.initDataUnsafe?.user;
      if (!tgUser?.id) {
        setError("Открой приложение внутри Telegram");
        return;
      }
      const telegramId = tgUser.id;
      const user = await registerUser({
        telegram_id: telegramId,
        role: "customer" as UserRole,
        first_name: name.trim(),
        last_name: surname.trim() || undefined,
        phone: phone.trim(),
        // поля для компании пока некуда класть в бэк — оставляем на будущее
        city: undefined,
        experience_years: null,
        specializations: null,
        portfolio_photos: null,
      });

      saveUserToStorage(user);

      navigate("/welcome/customer");
    } catch (e: any) {
      setError(e.message ?? "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      {/* ФОН */}
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
          Регистрация заказчика
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
        </div>

        {/* КНОПКА ДЛЯ bottom-sheet */}
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
          Тип заказчика
        </button>

        {customerType && (
          <div className="text-center text-blue-100 mt-3 text-sm">
            Вы выбрали:{" "}
            {customerType === "person" ? "Физическое лицо" : "Компания"}
          </div>
        )}

        {/* Доп. поля для компании */}
        {customerType === "company" && (
          <div className="flex flex-col gap-5 mt-6">
            <Input
              label="Название компании"
              placeholder="ООО «Пример»"
              value={companyName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setCompanyName(e.target.value)
              }
            />

            <Input
              label="ИНН"
              placeholder="Введите ИНН"
              value={inn}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setInn(e.target.value)
              }
            />
          </div>
        )}

        {/* Ошибка */}
        {error && (
          <div className="mt-4 text-center text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* CTA */}
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

      {/* ===== bottom-sheet выбора типа заказчика ===== */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <div className="p-5">
          <h2 className="text-xl font-bold text-white text-center mb-4 drop-shadow">
            Выберите тип заказчика
          </h2>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setCustomerType("person");
                setSheetOpen(false);
              }}
              className="
                w-full py-3 rounded-xl bg-white/20 border border-white/30 
                backdrop-blur-xl text-white font-semibold hover:bg-white/30 transition
              "
            >
              Физическое лицо
            </button>

            <button
              onClick={() => {
                setCustomerType("company");
                setSheetOpen(false);
              }}
              className="
                w-full py-3 rounded-xl bg-white/20 border border-white/30 
                backdrop-blur-xl text-white font-semibold hover:bg-white/30 transition
              "
            >
              Компания
            </button>
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
            Закрыть
          </button>
        </div>
      </BottomSheet>
    </Page>
  );
}
