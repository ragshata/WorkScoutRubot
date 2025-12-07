import Page from "../../components/layout/Page";
import { useEffect, useState, type FormEvent } from "react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import {
  createSupportTicket,
  getMySupportTickets,
  type SupportTicket,
} from "../../api/support";

export default function Support() {
  const [animate, setAnimate] = useState(false);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setAnimate(true));
  }, []);

  // грузим мои тикеты
  useEffect(() => {
    const run = async () => {
      try {
        setLoadingTickets(true);
        setTicketsError(null);
        const data = await getMySupportTickets();
        setTickets(data);
      } catch (e: any) {
        setTicketsError(e?.message ?? "Не удалось загрузить обращения");
      } finally {
        setLoadingTickets(false);
      }
    };
    run();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSendError(null);
    setSendSuccess(null);

    if (!subject.trim()) {
      setSendError("Укажи тему обращения");
      return;
    }
    if (!message.trim()) {
      setSendError("Опиши, что случилось");
      return;
    }

    try {
      setSending(true);
      const ticket = await createSupportTicket({
        topic: subject.trim(),      // ⬅️ было subject, теперь topic
        message: message.trim(),
      });

      setTickets((prev) => [ticket, ...prev]);
      setSubject("");
      setMessage("");
      setSendSuccess("Обращение отправлено в поддержку");
    } catch (e: any) {
      setSendError(e?.message ?? "Не удалось отправить обращение");
    } finally {
      setSending(false);
    }
  };

  const getStatusLabel = (status: SupportTicket["status"]) => {
    if (status === "open") return "Открыто";
    if (status === "in_progress") return "В работе";
    return "Закрыто";
  };

  const getStatusClass = (status: SupportTicket["status"]) => {
    if (status === "open")
      return "bg-red-400/20 text-red-100 border-red-300/70";
    if (status === "in_progress")
      return "bg-amber-400/20 text-amber-100 border-amber-300/70";
    return "bg-emerald-400/20 text-emerald-100 border-emerald-300/70";
  };

  return (
    <Page>
      {/* фон */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-800 via-blue-900 to-blue-950 z-0" />

      <div
        className={`
          relative z-10 h-full flex flex-col gap-4 px-4 pt-6 pb-6
          text-white transition-all duration-500
          ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
        `}
      >
        <header className="mb-2">
          <h1 className="text-xl font-semibold mb-1">Поддержка</h1>
          <p className="text-[12px] text-blue-100/80">
            Если что-то пошло не так — напиши нам, поможем разобраться.
          </p>
        </header>

        {/* форма обращения */}
        <section
          className="
            rounded-3xl border border-white/20 bg-white/5 backdrop-blur-xl
            px-4 py-4 mb-2
          "
        >
          <h2 className="text-[13px] font-semibold mb-3">
            Новое обращение
          </h2>

          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <Input
              label="Тема"
              placeholder="Например, спор по оплате или блокировка"
              value={subject}
              onChange={setSubject}
            />

            <div>
              <div className="text-[11px] text-blue-100/90 mb-1">
                Описание
              </div>
              <textarea
                className="
                  w-full min-h-[80px] rounded-2xl px-3 py-2 text-[13px]
                  bg-white/10 border border-white/20 text-white
                  placeholder:text-blue-100/60
                  outline-none focus:border-blue-300/80
                "
                placeholder="Опиши ситуацию максимально конкретно"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {sendError && (
              <p className="text-[11px] text-red-300">{sendError}</p>
            )}
            {sendSuccess && (
              <p className="text-[11px] text-emerald-300">{sendSuccess}</p>
            )}

            <Button type="submit" disabled={sending}>
              {sending ? "Отправляем..." : "Отправить в поддержку"}
            </Button>
          </form>
        </section>

        {/* список моих тикетов */}
        <section
          className="
            rounded-3xl border border-white/20 bg-white/5 backdrop-blur-xl
            px-4 py-4 flex-1 min-h-0
          "
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold">
              Мои обращения
            </h2>
          </div>

          {loadingTickets ? (
            <p className="text-[12px] text-blue-100/80">
              Загружаем обращения...
            </p>
          ) : ticketsError ? (
            <p className="text-[12px] text-red-300">{ticketsError}</p>
          ) : tickets.length === 0 ? (
            <p className="text-[12px] text-blue-100/80">
              Пока обращений нет. Если появится проблема — пиши сюда.
            </p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[260px] overflow-auto pr-1">
              {tickets.map((t) => (
                <article
                  key={t.id}
                  className="
                    rounded-2xl bg-white/10 border border-white/15
                    px-3 py-2.5 text-[12px]
                  "
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="font-medium line-clamp-1">
                      {t.topic} {/* ⬅️ было t.subject */}
                    </div>
                    <span
                      className={`
                        px-2 py-0.5 rounded-full text-[9px] border
                        ${getStatusClass(t.status)}
                      `}
                    >
                      {getStatusLabel(t.status)}
                    </span>
                  </div>

                  <p className="text-blue-100/85 text-[11px] line-clamp-2">
                    {t.message}
                  </p>

                  <div className="mt-1 text-[10px] text-blue-200/70">
                    {new Date(t.created_at).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="mt-3 text-[10px] text-blue-200/70">
            Правовую информацию и оферту можно разместить на отдельных экранах
            или в веб-страницах, если это потребуется регуляторике.
          </p>
        </section>
      </div>
    </Page>
  );
}