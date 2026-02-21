/**
 * useBenchmarks Hook
 *
 * Custom React hook for fetching AI safety benchmark data from the FastAPI backend.
 * Uses TanStack Query (React Query) for efficient data fetching, caching, and state management.
 */

import { useQuery, UseQueryResult } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";

// API Configuration
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_API || "";

// Types
export interface BenchmarkResult {
  model_name: string;
  source: string;
  safety_score: number;
  metric: string;
  raw_score?: number;
  score_scale?: string;
}

export interface ModelSummary {
  model_name: string;
  found: boolean;
  average_safety_score?: number;
  min_score?: number;
  max_score?: number;
  metrics_evaluated?: number;
  sources?: string[];
  details?: BenchmarkResult[];
}

export interface BenchmarkFilters {
  sources?: string[];
  limit?: number;
  sortBy?: "safety_score" | "model_name" | "source";
  sortDesc?: boolean;
}

export interface BenchmarkError {
  message: string;
  status?: number;
}

// API Client
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// API Functions
async function fetchBenchmarks(
  filters?: BenchmarkFilters
): Promise<BenchmarkResult[]> {
  const params = new URLSearchParams();

  if (filters?.sources?.length) {
    params.set("sources", filters.sources.join(","));
  }
  if (filters?.limit) {
    params.set("limit", filters.limit.toString());
  }
  if (filters?.sortBy) {
    params.set("sort_by", filters.sortBy);
  }
  if (filters?.sortDesc !== undefined) {
    params.set("sort_desc", filters.sortDesc.toString());
  }

  const response = await apiClient.get<BenchmarkResult[]>(
    `/api/benchmarks?${params.toString()}`
  );
  return response.data;
}

async function fetchModelSummary(modelName: string): Promise<ModelSummary> {
  const response = await apiClient.get<ModelSummary>(
    `/api/benchmarks/model/${encodeURIComponent(modelName)}`
  );
  return response.data;
}

// Query Keys
export const benchmarkKeys = {
  all: ["benchmarks"] as const,
  list: (filters?: BenchmarkFilters) =>
    [...benchmarkKeys.all, "list", filters] as const,
  model: (modelName: string) =>
    [...benchmarkKeys.all, "model", modelName] as const,
};

// Hooks

/**
 * Hook to fetch all benchmarks with optional filtering
 *
 * @param filters - Optional filters for sources, limit, and sorting
 * @returns TanStack Query result with benchmark data
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useBenchmarks({
 *   sources: ['huggingface', 'helm'],
 *   sortBy: 'safety_score',
 *   sortDesc: true
 * });
 * ```
 */
export function useBenchmarks(
  filters?: BenchmarkFilters
): UseQueryResult<BenchmarkResult[], AxiosError<BenchmarkError>> {
  return useQuery({
    queryKey: benchmarkKeys.list(filters),
    queryFn: () => fetchBenchmarks(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Hook to fetch safety summary for a specific model
 *
 * @param modelName - Name of the model to fetch
 * @param enabled - Whether to enable the query (default: true)
 * @returns TanStack Query result with model summary
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useModelBenchmarks('GPT-4o');
 * ```
 */
export function useModelBenchmarks(
  modelName: string,
  enabled = true
): UseQueryResult<ModelSummary, AxiosError<BenchmarkError>> {
  return useQuery({
    queryKey: benchmarkKeys.model(modelName),
    queryFn: () => fetchModelSummary(modelName),
    enabled: enabled && !!modelName,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Hook specifically for HuggingFace benchmarks
 */
export function useHuggingFaceBenchmarks() {
  return useBenchmarks({
    sources: ["huggingface"],
    sortBy: "safety_score",
    sortDesc: true,
  });
}

/**
 * Hook specifically for HELM benchmarks
 */
export function useHELMBenchmarks() {
  return useBenchmarks({
    sources: ["helm"],
    sortBy: "safety_score",
    sortDesc: true,
  });
}

// Utility functions for working with benchmark data

/**
 * Get the safety level classification based on score
 */
export function getSafetyLevel(
  score: number
): "high" | "medium" | "low" | "critical" {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  if (score >= 50) return "low";
  return "critical";
}

/**
 * Get color class based on safety score
 */
export function getScoreColorClass(score: number): string {
  if (score >= 80) return "text-green-600 bg-green-50";
  if (score >= 60) return "text-yellow-600 bg-yellow-50";
  if (score >= 50) return "text-orange-600 bg-orange-50";
  return "text-red-600 bg-red-50";
}

/**
 * Group benchmarks by model name
 */
export function groupByModel(
  benchmarks: BenchmarkResult[]
): Map<string, BenchmarkResult[]> {
  const grouped = new Map<string, BenchmarkResult[]>();

  for (const benchmark of benchmarks) {
    const existing = grouped.get(benchmark.model_name) || [];
    existing.push(benchmark);
    grouped.set(benchmark.model_name, existing);
  }

  return grouped;
}

/**
 * Calculate average safety score for a model across all metrics
 */
export function calculateAverageScore(benchmarks: BenchmarkResult[]): number {
  if (benchmarks.length === 0) return 0;

  const sum = benchmarks.reduce((acc, b) => acc + b.safety_score, 0);
  return Math.round((sum / benchmarks.length) * 10) / 10;
}

export default useBenchmarks;
