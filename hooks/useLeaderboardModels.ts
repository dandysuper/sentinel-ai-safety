import { useMemo } from 'react';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import axios from 'axios';

import { AIModel, SafetyProfile, SourceData } from '../types';

const BACKEND_API_BASE = import.meta.env.VITE_BACKEND_API || '';

export interface BenchmarkResult {
  model_name: string;
  source: string;
  safety_score: number;
  metric: string;
  raw_score?: number | null;
  score_scale?: string | null;
}

export interface LeaderboardModelsData {
  models: AIModel[];
  leaderboardAverage: SafetyProfile;
  sourceUpdatedAt?: string;
}

function stableHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function toModelId(modelName: string): string {
  const slug = modelName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return `${slug}-${stableHash(modelName).slice(0, 6)}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function blankProfile(): SafetyProfile {
  return {
    nonToxicity: 0,
    nonStereotype: 0,
    advRobustness: 0,
    oodRobustness: 0,
    advDemoRobustness: 0,
    privacy: 0,
    ethics: 0,
    fairness: 0,
  };
}

function computeAverageProfile(models: AIModel[]): SafetyProfile {
  if (!models.length) return blankProfile();

  const totals = models.reduce(
    (acc, m) => {
      acc.nonToxicity += m.safetyProfile.nonToxicity;
      acc.nonStereotype += m.safetyProfile.nonStereotype;
      acc.advRobustness += m.safetyProfile.advRobustness;
      acc.oodRobustness += m.safetyProfile.oodRobustness;
      acc.advDemoRobustness += m.safetyProfile.advDemoRobustness;
      acc.privacy += m.safetyProfile.privacy;
      acc.ethics += m.safetyProfile.ethics;
      acc.fairness += m.safetyProfile.fairness;
      return acc;
    },
    {
      nonToxicity: 0,
      nonStereotype: 0,
      advRobustness: 0,
      oodRobustness: 0,
      advDemoRobustness: 0,
      privacy: 0,
      ethics: 0,
      fairness: 0,
    }
  );

  return {
    nonToxicity: round1(totals.nonToxicity / models.length),
    nonStereotype: round1(totals.nonStereotype / models.length),
    advRobustness: round1(totals.advRobustness / models.length),
    oodRobustness: round1(totals.oodRobustness / models.length),
    advDemoRobustness: round1(totals.advDemoRobustness / models.length),
    privacy: round1(totals.privacy / models.length),
    ethics: round1(totals.ethics / models.length),
    fairness: round1(totals.fairness / models.length),
  };
}

function inferDeveloper(modelName: string): { developer: string; shortName: string } {
  if (modelName.includes('/')) {
    const [dev, ...rest] = modelName.split('/');
    return { developer: dev || 'Сообщество', shortName: rest.join('/') || modelName };
  }
  return { developer: 'Сообщество', shortName: modelName };
}

function inferType(modelName: string): 'Open' | 'Closed' {
  const s = modelName.toLowerCase();
  const closedHints = ['gpt-', 'openai', 'claude', 'anthropic', 'gemini', 'google', 'o1', 'chatgpt', 'grok', 'kimi', 'nova'];
  const openHints = ['llama', 'mistral', 'phi-', 'phi 3', 'phi 4', 'gemma', 'qwen', 'deepseek', 'olmo', 'falcon', 'command', 'aya', 'jamba', 'solar', 'magistral', 'yi-', 'yi 1'];
  if (openHints.some((h) => s.includes(h))) return 'Open';
  return closedHints.some((h) => s.includes(h)) ? 'Closed' : 'Open';
}

function linkForSource(source: string): string | undefined {
  const s = source.toLowerCase();
  if (s.includes('huggingface')) {
    return 'https://huggingface.co/spaces/AI-Secure/llm-trustworthy-leaderboard';
  }
  if (s.includes('ailuminate') || s.includes('mlcommons')) {
    return 'https://ailuminate.mlcommons.org/';
  }
  if (s.includes('calypso') || s.includes('casi')) {
    return 'https://calypsoai.com/calypsoai-model-leaderboard/';
  }
  if (s.includes('phare') || s.includes('giskard')) {
    return 'https://phare.giskard.ai/';
  }
  return undefined;
}

function applyMetric(profile: SafetyProfile, metric: string, score: number) {
  switch (metric) {
    // AILuminate / HuggingFace metrics
    case 'Non-toxicity':
    case 'Toxicity Assessment':
    case 'Harmfulness Prevention':
      profile.nonToxicity = Math.max(profile.nonToxicity, score);
      return;
    case 'Non-stereotype':
    case 'Bias Resistance':
      profile.nonStereotype = Math.max(profile.nonStereotype, score);
      return;
    case 'Adversarial robustness':
    case 'CASI (Jailbreak & Injection Resistance)':
    case 'Encoding Jailbreak Resistance':
    case 'Framing Jailbreak Resistance':
    case 'Prompt Injection Resistance':
      profile.advRobustness = Math.max(profile.advRobustness, score);
      return;
    case 'OOD robustness':
    case 'Factuality (Misinformation Resistance)':
      profile.oodRobustness = Math.max(profile.oodRobustness, score);
      return;
    case 'Robustness to adversarial demos':
    case 'AWR (Agentic Warfare Resistance)':
      profile.advDemoRobustness = Math.max(profile.advDemoRobustness, score);
      return;
    case 'Privacy':
    case 'Privacy Prevention':
      profile.privacy = Math.max(profile.privacy, score);
      return;
    case 'Ethics':
      profile.ethics = Math.max(profile.ethics, score);
      return;
    case 'Fairness':
      profile.fairness = Math.max(profile.fairness, score);
      return;
    default:
      return;
  }
}

async function fetchBenchmarkResults(limit: number): Promise<BenchmarkResult[]> {
  const url = `${BACKEND_API_BASE.replace(/\/$/, '')}/api/benchmarks`;
  const response = await axios.get<BenchmarkResult[]>(url, {
    timeout: 30000,
    params: {
      limit,
      sort_by: 'safety_score',
      sort_desc: true,
    },
    headers: { Accept: 'application/json' },
  });
  return response.data;
}

function toModels(results: BenchmarkResult[]): AIModel[] {
  const byModel = new Map<string, BenchmarkResult[]>();
  for (const r of results) {
    if (!r?.model_name) continue;
    const list = byModel.get(r.model_name) ?? [];
    list.push(r);
    byModel.set(r.model_name, list);
  }

  const models: AIModel[] = [];

  for (const [modelName, rows] of byModel) {
    const { developer, shortName } = inferDeveloper(modelName);
    const profile: SafetyProfile = blankProfile();

    const sources: SourceData[] = rows.map((r) => ({
      source: r.source,
      metric: r.metric,
      score: round1(r.safety_score),
      maxScore: 100,
      link: linkForSource(r.source),
    }));

    // Fill profile from per-metric rows
    for (const r of rows) {
      applyMetric(profile, r.metric, round1(r.safety_score));
    }

    // Aggregate safety score: if backend provides Safety Average, use it.
    const avgRow = rows.find((r) => r.metric === 'Safety Average');
    const agg = avgRow ? avgRow.safety_score : rows.reduce((acc, r) => acc + r.safety_score, 0) / Math.max(1, rows.length);

    models.push({
      id: toModelId(modelName),
      rank: 0,
      name: shortName,
      developer,
      type: inferType(modelName),
      params: 'Неизвестно',
      releaseDate: 'Неизвестно',
      license: undefined,
      aggregateScore: round1(agg),
      safetyProfile: profile,
      trend: Array(7).fill(round1(agg)),
      sources,
    });
  }

  models.sort((a, b) => b.aggregateScore - a.aggregateScore);
  return models.map((m, i) => ({ ...m, rank: i + 1 }));
}

async function fetchLeaderboardModels(limit: number): Promise<LeaderboardModelsData> {
  const results = await fetchBenchmarkResults(limit);
  const models = toModels(results);

  return {
    models,
    leaderboardAverage: computeAverageProfile(models),
    sourceUpdatedAt: undefined,
  };
}

export function useLeaderboardModels(limit = 100): UseQueryResult<LeaderboardModelsData> {
  const safeLimit = Math.min(Math.max(1, limit), 250);
  return useQuery({
    queryKey: ['sentinel-safety-benchmarks', safeLimit],
    queryFn: () => fetchLeaderboardModels(safeLimit),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

export function useLeaderboardModelById(
  id: string | undefined,
  limit = 100
): UseQueryResult<AIModel | undefined> {
  const modelsQuery = useLeaderboardModels(limit);
  const model = useMemo(() => {
    if (!modelsQuery.data?.models || !id) return undefined;
    return modelsQuery.data.models.find((m) => m.id === id);
  }, [modelsQuery.data?.models, id]);

  return {
    ...modelsQuery,
    data: model,
  } as UseQueryResult<AIModel | undefined>;
}
