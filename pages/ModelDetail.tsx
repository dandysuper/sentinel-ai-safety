import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Share2,
  Download,
  Bot,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { useLeaderboardModels } from "../hooks/useLeaderboardModels";
import { generateSafetyAnalysis } from "../services/geminiService";
import { ScoreBadge } from "../components/ScoreBadge";
import { SafetyRadar } from "../components/SafetyRadar";
import { Sparkline } from "../components/Sparkline";

export const ModelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useLeaderboardModels(100);
  const models = data?.models?.length ? data.models : [];
  const model = models.find((m) => m.id === id);
  const [analysis, setAnalysis] = useState<string>("");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    setAnalysis("");
  }, [id]);

  const handleGenerateAnalysis = async () => {
    if (!model) return;
    setLoadingAnalysis(true);
    const text = await generateSafetyAnalysis(model);
    setAnalysis(text);
    setLoadingAnalysis(false);
  };

  if (!model) {
    if (isLoading) {
      return (
        <div className="p-10 text-center text-slate-500">
          Загрузка модели...
        </div>
      );
    }
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold text-slate-800">Модель не найдена</h2>
        <Link
          to="/"
          className="text-blue-600 hover:underline mt-4 inline-block"
        >
          Вернуться на главную
        </Link>
      </div>
    );
  }

  const metrics = [
    { label: "Нетоксичность", val: model.safetyProfile.nonToxicity },
    { label: "Нестереотипность", val: model.safetyProfile.nonStereotype },
    { label: "Адв. устойчивость", val: model.safetyProfile.advRobustness },
    { label: "OOD устойчивость", val: model.safetyProfile.oodRobustness },
    { label: "Адв. демо", val: model.safetyProfile.advDemoRobustness },
    { label: "Конфиденциальность", val: model.safetyProfile.privacy },
    { label: "Этика", val: model.safetyProfile.ethics },
    { label: "Справедливость", val: model.safetyProfile.fairness },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Назад к панели
      </Link>

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        {/* Top row: name + badge */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">
                {model.name}
              </h1>
              <span
                className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${
                  model.type === "Open"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {model.type === "Open" ? "Открытый" : "Закрытый"} источник
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Разработчик:{" "}
              <span className="font-medium text-slate-700">
                {model.developer}
              </span>
              {model.params !== "Неизвестно" && (
                <> &bull; {model.params} параметров</>
              )}
            </p>
          </div>

          {/* Score + trend */}
          <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
                Балл безопасности
              </div>
              <ScoreBadge score={model.aggregateScore} size="lg" />
            </div>
            <div className="hidden sm:block h-10 w-px bg-slate-200" />
            <div className="hidden sm:block">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
                Тренд
              </div>
              <Sparkline data={model.trend} />
            </div>
          </div>
        </div>

        {/* Mobile trend row */}
        <div className="sm:hidden mt-3 pt-3 border-t border-slate-100 flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Тренд 7 дней
          </span>
          <Sparkline data={model.trend} />
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left / main column: radar + sources */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Radar chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4 sm:mb-6">
              Профиль безопасности
            </h3>

            {/* Radar — taller on mobile so labels aren't cramped */}
            <div className="h-[280px] sm:h-[340px] lg:h-[400px] w-full">
              <SafetyRadar
                profile={model.safetyProfile}
                compareProfile={data?.leaderboardAverage}
                name={model.name}
                compareName={
                  data?.leaderboardAverage ? "Ср. по рейтингу" : undefined
                }
              />
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 opacity-60 flex-shrink-0" />
                {model.name}
              </div>
              {data?.leaderboardAverage && (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-300 opacity-60 flex-shrink-0" />
                  Ср. по рейтингу
                </div>
              )}
            </div>
          </div>

          {/* Metric bars — mobile-friendly alternative view */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm lg:hidden">
            <h3 className="text-base font-semibold text-slate-800 mb-4">
              Метрики безопасности
            </h3>
            <div className="space-y-3">
              {metrics.map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{m.label}</span>
                    <span className="font-mono text-slate-900 font-medium">
                      {m.val}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        m.val >= 80
                          ? "bg-emerald-500"
                          : m.val >= 65
                            ? "bg-blue-500"
                            : m.val >= 50
                              ? "bg-amber-500"
                              : "bg-rose-500"
                      }`}
                      style={{ width: `${m.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sources table */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">
              Разбивка по источникам
            </h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-none sm:rounded-lg border-y sm:border border-slate-200">
              <table className="w-full text-left text-sm min-w-[420px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-3 font-medium">Источник</th>
                    <th className="p-3 font-medium">Метрика</th>
                    <th className="p-3 font-medium text-right whitespace-nowrap">
                      Балл
                    </th>
                    <th className="p-3 font-medium hidden sm:table-cell" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {model.sources.length > 0 ? (
                    model.sources.map((src, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-3 text-slate-900 font-medium whitespace-nowrap">
                          {src.source}
                        </td>
                        <td className="p-3 text-slate-600 max-w-[180px] truncate">
                          {src.metric}
                        </td>
                        <td className="p-3 text-right font-mono whitespace-nowrap">
                          {src.score}/{src.maxScore}
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          {src.link && (
                            <a
                              href={src.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-4 text-center text-slate-400"
                      >
                        Данные внешних источников отсутствуют
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: AI analysis + details */}
        <div className="space-y-4 sm:space-y-6">
          {/* Metric bars — desktop only (mobile shows them above) */}
          <div className="hidden lg:block bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Метрики
            </h3>
            <div className="space-y-3">
              {metrics.map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{m.label}</span>
                    <span className="font-mono text-slate-900 font-medium">
                      {m.val}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        m.val >= 80
                          ? "bg-emerald-500"
                          : m.val >= 65
                            ? "bg-blue-500"
                            : m.val >= 50
                              ? "bg-amber-500"
                              : "bg-rose-500"
                      }`}
                      style={{ width: `${m.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gemini AI Analyst */}
          <div className="bg-gradient-to-b from-indigo-50 to-white rounded-xl border border-indigo-100 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <h3 className="text-base sm:text-lg font-semibold text-indigo-900">
                ИИ-аналитик безопасности
              </h3>
            </div>

            {!analysis ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-indigo-800/70 text-sm mb-4">
                  Сгенерировать качественный анализ с помощью Gemini Flash.
                </p>
                <button
                  onClick={handleGenerateAnalysis}
                  disabled={loadingAnalysis}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loadingAnalysis ? (
                    <>
                      <svg
                        className="animate-spin w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                      Анализ...
                    </>
                  ) : (
                    "Сгенерировать отчёт"
                  )}
                </button>
              </div>
            ) : (
              <div>
                <div className="prose prose-sm prose-indigo text-slate-700 space-y-2">
                  {analysis
                    .split("\n")
                    .filter((p) => p.trim())
                    .map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t border-indigo-100 flex items-center gap-2 text-xs text-indigo-500">
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Анализ сгенерирован Gemini
                </div>
                <button
                  onClick={handleGenerateAnalysis}
                  disabled={loadingAnalysis}
                  className="mt-3 w-full text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-md py-1.5 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                >
                  Обновить анализ
                </button>
              </div>
            )}
          </div>

          {/* Details card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Подробности
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Выпущена</dt>
                <dd className="font-medium text-slate-900 text-right">
                  {model.releaseDate}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Лицензия</dt>
                <dd className="font-medium text-slate-900 text-right">
                  {model.license ||
                    (model.type === "Open" ? "Открытая" : "Проприетарная")}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Параметры</dt>
                <dd className="font-medium text-slate-900 text-right">
                  {model.params}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Ранг</dt>
                <dd className="font-medium text-slate-900 text-right">
                  #{model.rank}
                </dd>
              </div>
            </dl>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="border border-slate-200 rounded-md py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors">
                <Share2 className="w-4 h-4" /> Поделиться
              </button>
              <button className="border border-slate-200 rounded-md py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors">
                <Download className="w-4 h-4" /> Экспорт
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
