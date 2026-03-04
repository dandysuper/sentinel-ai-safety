import React from 'react';
import { ExternalLink, BookOpen, Loader2 } from 'lucide-react';

import { useSafetyDatasets } from '../hooks/useSafetyDatasets';

export const Benchmarks: React.FC = () => {
  const { data, isLoading, error } = useSafetyDatasets();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Бенчмарки безопасности и предвзятости</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400">
          Актуальный список широко используемых открытых наборов данных для оценки безопасности LLM.
        </p>
        <a
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          href="https://www.promptfoo.dev/blog/top-llm-safety-bias-benchmarks/"
          target="_blank"
          rel="noreferrer"
        >
          Источник: promptfoo.dev <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {isLoading && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <Loader2 className="w-5 h-5 animate-spin" />
          Загрузка списка бенчмарков...
        </div>
      )}

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 rounded-xl p-6 text-rose-800 dark:text-rose-200">
          Не удалось загрузить список бенчмарков из сети.
        </div>
      )}

      {!!data?.length && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.map((d) => (
            <div
              key={d.slug}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    Набор данных #{d.rank}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">{d.title}</h3>
                </div>

                <a
                  className="text-slate-400 hover:text-slate-700"
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  title="Открыть раздел"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>

              {d.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {d.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 rounded border bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {d.summary && <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">{d.summary}</p>}

              {d.links.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
                    Основные ссылки
                  </div>
                  <div className="space-y-1 text-sm">
                    {d.links.map((l) => (
                      <a
                        key={l.url}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="truncate">{l.label}</span>
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
