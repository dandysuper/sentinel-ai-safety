import React, { useEffect, useState } from "react";
import { useLeaderboardModels } from "../hooks/useLeaderboardModels";
import { SafetyRadar } from "../components/SafetyRadar";
import { ScoreBadge } from "../components/ScoreBadge";
import { ChevronDown, X, PlusCircle } from "lucide-react";

export const Comparison: React.FC = () => {
  const { data, error } = useLeaderboardModels(100);
  const models = data?.models?.length ? data.models : [];

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (selectedIds.length > 0) return;
    if (models.length < 2) return;
    setSelectedIds([models[0].id, models[1].id]);
  }, [models, selectedIds.length]);

  const selectedModels = selectedIds
    .map((id) => models.find((m) => m.id === id))
    .filter(Boolean) as typeof models;

  const handleAddModel = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (
      e.target.value &&
      !selectedIds.includes(e.target.value) &&
      selectedIds.length < 3
    ) {
      setSelectedIds([...selectedIds, e.target.value]);
    }
    e.target.value = "";
  };

  const removeModel = (id: string) => {
    setSelectedIds(selectedIds.filter((mid) => mid !== id));
  };

  const metrics: Array<{
    label: string;
    key: keyof (typeof selectedModels)[0]["safetyProfile"];
  }> = [
    { label: "Нетоксичность", key: "nonToxicity" },
    { label: "Нестереотипность", key: "nonStereotype" },
    { label: "Адв. устойчивость", key: "advRobustness" },
    { label: "OOD устойчивость", key: "oodRobustness" },
    { label: "Адв. демо", key: "advDemoRobustness" },
    { label: "Конфиденциальность", key: "privacy" },
    { label: "Этика", key: "ethics" },
    { label: "Справедливость", key: "fairness" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Сравнение безопасности
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Сравните до 3 моделей рядом.
          </p>
        </div>

        {selectedIds.length < 3 && (
          <div className="relative w-full sm:w-auto">
            <select
              className="w-full sm:w-auto appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-2.5 pl-4 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              onChange={handleAddModel}
              defaultValue=""
            >
              <option value="" disabled>
                Добавить модель для сравнения
              </option>
              {models.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  disabled={selectedIds.includes(m.id)}
                >
                  {m.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {error && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-amber-900 dark:text-amber-200 text-sm">
          Не удалось загрузить данные моделей.
        </div>
      )}

      {/* ── Empty state ── */}
      {selectedModels.length === 0 && (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <PlusCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">
            Выберите модели для начала сравнения
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Используйте выпадающий список выше
          </p>
        </div>
      )}

      {/* ── Model cards grid ── */}
      {selectedModels.length > 0 && (
        <div
          className={`grid grid-cols-1 gap-4 sm:gap-6 ${
            selectedModels.length === 2
              ? "md:grid-cols-2"
              : selectedModels.length === 3
                ? "md:grid-cols-2 lg:grid-cols-3"
                : ""
          }`}
        >
          {selectedModels.map((model) => (
            <div
              key={model.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col"
            >
              {/* Card header */}
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                    {model.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                    {model.developer}
                  </p>
                  <span
                    className={`mt-1.5 inline-block text-xs px-1.5 py-0.5 rounded border ${
                      model.type === "Open"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {model.type}
                  </span>
                </div>
                <button
                  onClick={() => removeModel(model.id)}
                  className="flex-shrink-0 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  aria-label="Удалить модель"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Card body */}
              <div className="p-4 sm:p-6 flex-1 space-y-5 sm:space-y-6">
                {/* Aggregate score */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Суммарный балл
                  </span>
                  <ScoreBadge score={model.aggregateScore} size="lg" />
                </div>

                {/* Metric bars */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Метрики
                  </h4>
                  {metrics.map(({ label, key }) => {
                    const val = model.safetyProfile[key] as number;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs sm:text-sm mb-1">
                          <span className="text-slate-600 dark:text-slate-400">{label}</span>
                          <span className="font-mono text-slate-900 dark:text-slate-100 font-medium">
                            {val}
                          </span>
                        </div>
                        <div className="h-1.5 sm:h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              val >= 80
                                ? "bg-emerald-500"
                                : val >= 65
                                  ? "bg-blue-500"
                                  : val >= 50
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                            }`}
                            style={{ width: `${val}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Radar chart */}
                <div className="h-[220px] sm:h-[260px] mt-2">
                  <SafetyRadar
                    profile={model.safetyProfile}
                    name={model.name}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add another CTA (when 1 or 2 selected) ── */}
      {selectedModels.length > 0 && selectedModels.length < 3 && (
        <div className="relative w-full sm:hidden">
          <select
            className="w-full appearance-none bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 py-3 pl-4 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            onChange={handleAddModel}
            defaultValue=""
          >
            <option value="" disabled>
              + Добавить ещё одну модель
            </option>
            {models.map((m) => (
              <option
                key={m.id}
                value={m.id}
                disabled={selectedIds.includes(m.id)}
              >
                {m.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      )}
    </div>
  );
};
