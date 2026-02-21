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
      <span className="text-xs text-slate-500 capitalize hidden sm:inline">
        {level}
      </span>
    </div>
  );
};

const SourceBadge: React.FC<{ source: string }> = ({ source }) => {
  const isHuggingFace = source.toLowerCase().includes("hugging");
  const isHELM = source.toLowerCase().includes("helm");

  let bgColor = "bg-slate-100 text-slate-700";
  if (isHuggingFace) bgColor = "bg-yellow-100 text-yellow-800";
  if (isHELM) bgColor = "bg-purple-100 text-purple-800";

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${bgColor}`}>
      {source}
    </span>
  );
};

const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
    <p className="text-slate-600">Loading safety benchmarks...</p>
    <p className="text-sm text-slate-400 mt-1">
      Fetching from HuggingFace and HELM
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
    <h3 className="text-lg font-semibold text-slate-900 mb-2">
      Failed to load benchmarks
    </h3>
    <p className="text-slate-600 text-center max-w-md mb-4">
      {error.message || "An error occurred while fetching the benchmark data."}
    </p>
    <button
      onClick={onRetry}
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      <RefreshCw className="w-4 h-4" />
      Retry
    </button>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="bg-slate-100 rounded-full p-3 mb-4">
      <AlertCircle className="w-8 h-8 text-slate-400" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 mb-2">
      No benchmarks found
    </h3>
    <p className="text-slate-600">
      No safety benchmark data is available at this time.
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
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
        <LoadingState />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  // Empty state
  if (!sortedData.length) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Safety Benchmarks
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {sortedData.length} results from aggregated sources
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th
                className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort("model_name")}
              >
                Model Name
                <SortIndicator field="model_name" />
              </th>
              <th
                className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort("safety_score")}
              >
                Safety Score
                <SortIndicator field="safety_score" />
              </th>
              {showMetric && (
                <th
                  className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort("metric")}
                >
                  Metric
                  <SortIndicator field="metric" />
                </th>
              )}
              {showSource && (
                <th
                  className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort("source")}
                >
                  Source
                  <SortIndicator field="source" />
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
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
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="font-medium">Score Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            High (80+)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            Medium (60-79)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            Low (50-59)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            Critical (&lt;50)
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
  <tr className="hover:bg-slate-50 transition-colors">
    <td className="px-6 py-4">
      <div className="font-medium text-slate-900">{benchmark.model_name}</div>
      {benchmark.raw_score !== undefined && (
        <div className="text-xs text-slate-500 mt-0.5">
          Raw: {benchmark.raw_score.toFixed(3)} ({benchmark.score_scale})
        </div>
      )}
    </td>
    <td className="px-6 py-4">
      <SafetyScoreBadge score={benchmark.safety_score} />
    </td>
    {showMetric && (
      <td className="px-6 py-4 text-slate-700">{benchmark.metric}</td>
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
