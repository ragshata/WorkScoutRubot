import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Page from "../../components/layout/Page";
import {
  getReviewsForUser,
  type UserReviewsResponse,
} from "../../api/reviews";
import { getUserFromStorage } from "../../api/users";


export default function UserReviewsPage() {
  const [animate, setAnimate] = useState(false);
  const [searchParams] = useSearchParams();

  const [data, setData] = useState<UserReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setAnimate(true));
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const urlUserId = searchParams.get("userId");
        let userId: number | null = urlUserId ? Number(urlUserId) : null;

        if (!userId || Number.isNaN(userId)) {
          const me = getUserFromStorage();
          if (!me) {
            setError("Не найден пользователь — нужна авторизация");
            setLoading(false);
            return;
          }
          userId = me.id;
        }

        const res = await getReviewsForUser(userId);
        setData(res);
      } catch (e: any) {
        setError(e?.message ?? "Не удалось загрузить отзывы");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [searchParams]);

  const rating = data?.rating ?? null;
  const count = data?.reviews_count ?? 0;

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
        <header>
          <h1 className="text-xl font-semibold mb-1">Отзывы</h1>
          <p className="text-[11px] text-slate-200/80">
            Что говорят о пользователе в WorkScout.
          </p>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-[13px] text-slate-100">
            Загружаем отзывы...
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[13px] text-rose-300">
            <span>{error}</span>
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-[13px] text-slate-100">
            Данных об отзывах нет.
          </div>
        ) : (
          <main className="flex-1 min-h-0 flex flex-col gap-3">
            {/* шапка с рейтингом */}
            <section
              className="
                rounded-3xl border border-white/20 bg-white/5 backdrop-blur-xl
                px-4 py-4
              "
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] text-slate-200/80 mb-0.5">
                    Средний рейтинг
                  </div>
                  <div className="text-2xl font-semibold">
                    {rating ? rating.toFixed(1) : "—"}
                  </div>
                  <div className="text-[11px] text-slate-200/80">
                    Отзывов:{" "}
                    <span className="font-semibold">{count}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* список отзывов */}
            <section
              className="
                rounded-3xl border border-white/20 bg-white/5 backdrop-blur-xl
                px-4 py-4 flex-1 min-h-0
              "
            >
              {data.reviews.length === 0 ? (
                <p className="text-[12px] text-slate-200/80">
                  Пока нет ни одного отзыва.
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[320px] overflow-auto pr-1">
                  {data.reviews.map((r) => (
                    <article
                      key={r.id}
                      className="
                        rounded-2xl bg-white/10 border border-white/20
                        px-3 py-2.5 text-[12px]
                      "
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="text-[11px] text-slate-200/80">
                          Оценка:{" "}
                          <span className="font-semibold">{r.rating}</span> / 5
                        </div>
                        <div className="text-[10px] text-slate-400">
                          заказ #{r.order_id}
                        </div>
                      </div>
                      <p className="text-[12px] text-slate-50 leading-snug">
                        {r.text}
                      </p>
                      <div className="mt-1 text-[10px] text-slate-400">
                        Автор: #{r.author_id}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </main>
        )}
      </div>
    </Page>
  );
}
