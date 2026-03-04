/**
 * SafetyTable Component
 *
 * Displays AI safety benchmark data in a clean, sortable table.
 * Features color-coded safety scores with Tailwind CSS styling.
 */

import React, { useState, useMemo } from "react";
import { AlertCircle, ArrowUpDown, Loader2, RefreshCw } from "lucide-react";
import {
  useBenchmarks,
  BenchmarkResult,
  BenchmarkFilters,
  getScoreColorClass,
  getSafetyLevel,
} from "../hooks/useBenchmarks";

// Types
type SortField = "model_name" | "safety_score" | "source" | "metric";
type SortDirection = "asc" | "desc";

interface SafetyTableProps {
  filters?: BenchmarkFilters;
  showSource?: boolean;
  showMetric?: boolean;
  className?: string;
}

interface SafetyScoreBadgeProps {
  score: number;
}

// Sub-components

const SafetyScoreBadge: React.FC<SafetyScoreBadgeProps> = ({ score }) => {
  const colorClass = getScoreColorClass(score);
  const level = getSafetyLevel(score);

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold ${colorClass}`}
      >
        {score.toFixed(1)}
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400 capitalize hidden sm:inline">
        {level}
      </span>
    </div>
  );
};

const SourceBadge: React.FC<{ source: string }> = ({ source }) => {
  const s = source.toLowerCase();
  const isHuggingFace = s.includes("hugging");
  const isAILuminate = s.includes("ailuminate") || s.includes("mlcommons");
  const isCalypso = s.includes("calypso") || s.includes("casi");
  const isPhare = s.includes("phare") || s.includes("giskard");

  let bgColor = "bg-slate-100 text-slate-700";
  if (isHuggingFace) bgColor = "bg-yellow-100 text-yellow-800";
  if (isAILuminate) bgColor = "bg-blue-100 text-blue-800";
  if (isCalypso) bgColor = "bg-red-100 text-red-800";
  if (isPhare) bgColor = "bg-emerald-100 text-emerald-800";

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${bgColor}`}>
      {source}
    </span>
  );
};

const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
    <p className="text-slate-600 dark:text-slate-400">Загрузка бенчмарков безопасности...</p>
    <p className="text-sm text-slate-400 mt-1">
      Получение данных из AILuminate, CalypsoAI, Phare и HuggingFace
    </p>
  </div>
);

const ErrorState: React.FC<{ error: Error; onRetry: () => void }> = ({
  error,
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="bg-red-50 rounded-full p-3 mb-4">
      <AlertCircle className="w-8 h-8 text-red-500" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
      Не удалось загрузить бенчмарки
    </h3>
    <p className="text-slate-600 dark:text-slate-400 text-center max-w-md mb-4">
      {error.message || "При получении данных бенчмарка произошла ошибка."}
    </p>
    <button
      onClick={onRetry}
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      <RefreshCw className="w-4 h-4" />
      Повторить
    </button>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="bg-slate-100 rounded-full p-3 mb-4">
      <AlertCircle className="w-8 h-8 text-slate-400" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
      Бенчмарки не найдены
    </h3>
    <p className="text-slate-600 dark:text-slate-400">
      Данные бенчмарков безопасности недоступны.
    </p>
  </div>
);

// Main Component

export const SafetyTable: React.FC<SafetyTableProps> = ({
  filters,
  showSource = true,
  showMetric = true,
  className = "",
}) => {
  const { data, isLoading, error, refetch, isFetching } = useBenchmarks(filters);

  // Local sorting state (client-side sorting for responsiveness)
  const [sortField, setSortField] = useState<SortField>("safety_score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Sorted data
  const sortedData = useMemo(() => {
    if (!data) return [];

    return [...data].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "model_name":
          comparison = a.model_name.localeCompare(b.model_name);
          break;
        case "safety_score":
          comparison = a.safety_score - b.safety_score;
          break;
        case "source":
          comparison = a.source.localeCompare(b.source);
          break;
        case "metric":
          comparison = a.metric.localeCompare(b.metric);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "safety_score" ? "desc" : "asc");
    }
  };

  // Render sort indicator
  const SortIndicator: React.FC<{ field: SortField }> = ({ field }) => (
    <ArrowUpDown
      className={`w-4 h-4 inline-block ml-1 ${
        sortField === field ? "text-blue-600" : "text-slate-400"
      }`}
    />
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <LoadingState />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  // Empty state
  if (!sortedData.length) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Бенчмарки безопасности
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {sortedData.length} результатов из агрегированных источников
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Обновить
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <th
                className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort("model_name")}
              >
                Название модели
                <SortIndicator field="model_name" />
              </th>
              <th
                className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort("safety_score")}
              >
                Балл безопасности
                <SortIndicator field="safety_score" />
              </th>
              {showMetric && (
                <th
                  className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort("metric")}
                >
                  Метрика
                  <SortIndicator field="metric" />
                </th>
              )}
              {showSource && (
                <th
                  className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort("source")}
                >
                  Источник
                  <SortIndicator field="source" />
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {sortedData.map((benchmark, index) => (
              <TableRow
                key={`${benchmark.model_name}-${benchmark.metric}-${benchmark.source}-${index}`}
                benchmark={benchmark}
                showSource={showSource}
                showMetric={showMetric}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with legend */}
      <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium">Обозначения:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            Высокий (80+)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            Средний (60-79)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            Низкий (50-59)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            Критический (&lt;50)
          </span>
        </div>
      </div>
    </div>
  );
};

// Table Row Component (for performance optimization)
const TableRow: React.FC<{
  benchmark: BenchmarkResult;
  showSource: boolean;
  showMetric: boolean;
}> = React.memo(({ benchmark, showSource, showMetric }) => (
  <tr className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
    <td className="px-6 py-4">
      <div className="font-medium text-slate-900 dark:text-slate-100">{benchmark.model_name}</div>
      {benchmark.raw_score !== undefined && (
        <div className="text-xs text-slate-500 mt-0.5">
          Исх.: {benchmark.raw_score.toFixed(3)} ({benchmark.score_scale})
        </div>
      )}
    </td>
    <td className="px-6 py-4">
      <SafetyScoreBadge score={benchmark.safety_score} />
    </td>
    {showMetric && (
      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{benchmark.metric}</td>
    )}
    {showSource && (
      <td className="px-6 py-4">
        <SourceBadge source={benchmark.source} />
      </td>
    )}
  </tr>
));

TableRow.displayName = "TableRow";

export default SafetyTable;
