import React from 'react';
import { ExternalLink, BookOpen, Loader2 } from 'lucide-react';

import { useSafetyDatasets } from '../hooks/useSafetyDatasets';

export const Benchmarks: React.FC = () => {
  const { data, isLoading, error } = useSafetyDatasets();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-slate-700" />
          <h1 className="text-2xl font-bold text-slate-900">Safety & Bias Benchmarks</h1>
        </div>
        <p className="text-slate-500">
          Live-parsed list of widely used open datasets for LLM safety evaluation.
        </p>
        <a
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          href="https://www.promptfoo.dev/blog/top-llm-safety-bias-benchmarks/"
          target="_blank"
          rel="noreferrer"
        >
          Source: promptfoo.dev <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center gap-3 text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          Fetching benchmark list...
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-800">
          Failed to fetch the benchmark list from the web.
        </div>
      )}

      {!!data?.length && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.map((d) => (
            <div
              key={d.slug}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    Dataset #{d.rank}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mt-1">{d.title}</h3>
                </div>

                <a
                  className="text-slate-400 hover:text-slate-700"
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  title="Open section"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>

              {d.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {d.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 rounded border bg-slate-50 text-slate-700 border-slate-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {d.summary && <p className="text-sm text-slate-600 mt-4">{d.summary}</p>}

              {d.links.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
                    Key Links
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
