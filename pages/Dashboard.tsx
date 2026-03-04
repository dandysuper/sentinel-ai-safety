import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { useLeaderboardModels } from "../hooks/useLeaderboardModels";
import { FilterState, SortField, SortOrder } from "../types";
import { ScoreBadge } from "../components/ScoreBadge";
import { Sparkline } from "../components/Sparkline";

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useLeaderboardModels(100);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    type: "All",
    minScore: 0,
  });
  const [sortConfig, setSortConfig] = useState<{
    field: SortField;
    order: SortOrder;
  }>({
    field: "rank",
    order: "asc",
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const filteredModels = useMemo(() => {
    const base = data?.models?.length ? data.models : [];
    let result = [...base];

    if (filters.search) {
      result = result.filter((m) =>
        m.name.toLowerCase().includes(filters.search.toLowerCase()),
      );
    }
    if (filters.type !== "All") {
      result = result.filter((m) => m.type === filters.type);
    }
    if (filters.minScore > 0) {
      result = result.filter((m) => m.aggregateScore >= filters.minScore);
    }

    result.sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];
      if (aValue < bValue) return sortConfig.order === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.order === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [data?.models, filters, sortConfig]);

  const topSafe = filteredModels.length
    ? [...filteredModels].sort((a, b) => b.aggregateScore - a.aggregateScore)[0]
    : undefined;
  const mostRisky = filteredModels.length
    ? [...filteredModels].sort((a, b) => a.aggregateScore - b.aggregateScore)[0]
    : undefined;

  const activeFilterCount = [
    filters.search !== "",
    filters.type !== "All",
    filters.minScore > 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({ search: "", type: "All", minScore: 0 });
  };

  const FiltersPanel = () => (
    <div className="space-y-4">
      {/* Search */}
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
          Поиск модели
        </label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="напр. GPT-4"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          {filters.search && (
            <button
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              onClick={() => setFilters({ ...filters, search: "" })}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Type toggle */}
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
          Тип доступа
        </label>
        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-md">
          {(["All", "Open", "Closed"] as const).map((type) => {
            const labels: Record<string, string> = {
              All: "Все",
              Open: "Открытые",
              Closed: "Закрытые",
            };
            return (
              <button
                key={type}
                onClick={() => setFilters({ ...filters, type })}
                className={`flex-1 text-xs py-1.5 rounded-sm font-medium transition-colors ${
                  filters.type === type
                    ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {labels[type]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Min score */}
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
          Мин. балл безопасности:{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {filters.minScore}
          </span>
        </label>
        <input
          type="range"
          min="0"
          max="90"
          step="5"
          value={filters.minScore}
          onChange={(e) =>
            setFilters({ ...filters, minScore: parseInt(e.target.value) })
          }
          className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0</span>
          <span>90</span>
        </div>
      </div>

      {/* Clear */}
      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="w-full text-xs text-rose-600 hover:text-rose-700 font-medium py-1.5 border border-rose-200 rounded-md hover:bg-rose-50 transition-colors"
        >
          Сбросить фильтры ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950 dark:to-slate-800 border border-emerald-100 dark:border-emerald-900 rounded-xl p-4 sm:p-6 shadow-sm flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-4">
            <h3 className="text-emerald-800 dark:text-emerald-400 font-semibold uppercase tracking-wider text-xs mb-1">
              Самая безопасная модель
            </h3>
            <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
              {topSafe?.name || (isLoading ? "Загрузка..." : "—")}
            </div>
            <div className="text-sm text-slate-500 truncate">
              {topSafe?.developer || " "}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-3xl sm:text-4xl font-bold text-emerald-600">
              {topSafe ? topSafe.aggregateScore.toFixed(1) : "—"}
            </div>
            <ShieldCheck className="inline-block w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 mt-1" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-950 dark:to-slate-800 border border-rose-100 dark:border-rose-900 rounded-xl p-4 sm:p-6 shadow-sm flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-4">
            <h3 className="text-rose-800 dark:text-rose-400 font-semibold uppercase tracking-wider text-xs mb-1">
              Наименьший балл безопасности
            </h3>
            <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
              {mostRisky?.name || (isLoading ? "Загрузка..." : "—")}
            </div>
            <div className="text-sm text-slate-500 truncate">
              {mostRisky?.developer || " "}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-3xl sm:text-4xl font-bold text-rose-600">
              {mostRisky ? mostRisky.aggregateScore.toFixed(1) : "—"}
            </div>
            <AlertTriangle className="inline-block w-5 h-5 sm:w-6 sm:h-6 text-rose-500 mt-1" />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-amber-900 dark:text-amber-200 text-sm">
          Не удалось загрузить данные бенчмарков.
        </div>
      )}

      {/* Mobile filter toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setFiltersOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Фильтры
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
          </div>
          {filtersOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {/* Mobile filters dropdown */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            filtersOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
            <FiltersPanel />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
        {/* Desktop Filters Sidebar */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                <Filter className="w-4 h-4" /> Фильтры
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-rose-500 hover:text-rose-700 font-medium"
                >
                  Сбросить
                </button>
              )}
            </div>
            <FiltersPanel />
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {/* Rank — visible on sm+ */}
                  <th
                    className="p-3 sm:p-4 font-semibold cursor-pointer hover:text-slate-700 w-12 hidden xs:table-cell sm:table-cell"
                    onClick={() => handleSort("rank")}
                  >
                    #
                  </th>
                  {/* Model name — always visible */}
                  <th
                    className="p-3 sm:p-4 font-semibold cursor-pointer hover:text-slate-700"
                    onClick={() => handleSort("name")}
                  >
                    Модель
                  </th>
                  {/* Type — hidden on mobile */}
                  <th className="p-3 sm:p-4 font-semibold hidden md:table-cell">
                    Тип
                  </th>
                  {/* Score — always visible */}
                  <th
                    className="p-3 sm:p-4 font-semibold cursor-pointer hover:text-slate-700 text-right"
                    onClick={() => handleSort("aggregateScore")}
                  >
                    Балл
                  </th>
                  {/* Trend — hidden on mobile */}
                  <th className="p-3 sm:p-4 font-semibold text-right hidden lg:table-cell">
                    Тренд
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredModels.map((model) => (
                  <tr
                    key={model.id}
                    onClick={() => navigate(`/model/${model.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors group"
                  >
                    {/* Rank */}
                    <td className="p-3 sm:p-4 text-slate-400 font-mono text-sm hidden xs:table-cell sm:table-cell">
                      {model.rank}
                    </td>

                    {/* Model name + developer + mobile rank */}
                    <td className="p-3 sm:p-4">
                      <div className="flex items-start gap-2">
                        {/* Mobile rank badge */}
                        <span className="sm:hidden mt-0.5 text-xs font-mono text-slate-400 w-6 flex-shrink-0">
                          #{model.rank}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base leading-tight truncate max-w-[160px] sm:max-w-none">
                            {model.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {model.developer}
                          </div>
                          {/* Mobile: show type inline */}
                          <div className="md:hidden mt-1">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded border ${
                                model.type === "Open"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {model.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type — desktop only */}
                    <td className="p-3 sm:p-4 hidden md:table-cell">
                      <span
                        className={`text-xs px-2 py-1 rounded border ${
                          model.type === "Open"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {model.type}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="p-3 sm:p-4 text-right">
                      <ScoreBadge score={model.aggregateScore} />
                    </td>

                    {/* Trend — desktop only */}
                    <td className="p-3 sm:p-4 hidden lg:table-cell">
                      <div className="flex justify-end">
                        <Sparkline data={model.trend} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredModels.length === 0 && (
            <div className="p-10 sm:p-12 text-center text-slate-500">
              {isLoading
                ? "Загрузка рейтинга..."
                : "Модели не найдены по заданным критериям."}
            </div>
          )}

          {/* Footer: result count */}
          {filteredModels.length > 0 && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              Показано {filteredModels.length}{" "}
              {filteredModels.length === data?.models?.length
                ? "моделей"
                : `из ${data?.models?.length ?? "..."} моделей`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
