import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { KeyRound, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

const BACKEND_API_BASE = import.meta.env.VITE_BACKEND_API || 'http://localhost:8000';

type SettingsStatus = {
  huggingface?: { configured?: boolean };
};

export const Settings: React.FC = () => {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; status?: number; error?: string } | null>(null);

  const loadStatus = async () => {
    const url = `${BACKEND_API_BASE.replace(/\/$/, '')}/api/settings`;
    const res = await axios.get(url, { timeout: 15000 });
    setStatus(res.data);
  };

  useEffect(() => {
    loadStatus().catch(() => setStatus(null));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const url = `${BACKEND_API_BASE.replace(/\/$/, '')}/api/settings`;
      await axios.post(
        url,
        { huggingface_token: token },
        { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
      );
      setToken('');
      await loadStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      const url = `${BACKEND_API_BASE.replace(/\/$/, '')}/api/settings/test`;
      const res = await axios.post(url, {}, { timeout: 20000 });
      setTestResult(res.data);
      await loadStatus();
    } catch (e: any) {
      setTestResult({ ok: false, error: e?.message || 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const configured = Boolean(status?.huggingface?.configured);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Настройки</h1>
        <p className="text-slate-500 dark:text-slate-400">Настройка интеграций для получения бенчмарков безопасности.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Токен Hugging Face</h2>
        </div>

        <div className="flex items-center gap-2 text-sm mb-4">
          {configured ? (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" /> Настроен
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-rose-700">
              <XCircle className="w-4 h-4" /> Не настроен
            </span>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Вставьте HF-токен (Только чтение)</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="hf_..."
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Токен отправляется на сервер и хранится в <code>backend/.env.local</code>. Повторно не отображается.
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading || token.trim().length < 10}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium disabled:opacity-50"
            >
              Сохранить
            </button>
            <button
              onClick={handleTest}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 text-slate-800 rounded-md text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Проверить
            </button>
          </div>

          {testResult && (
            <div className={`text-sm rounded-md p-3 border ${testResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              {testResult.ok ? (
                <div>Подключение успешно (HTTP {testResult.status}).</div>
              ) : (
                <div>Ошибка подключения{testResult.status ? ` (HTTP ${testResult.status})` : ''}{testResult.error ? `: ${testResult.error}` : '.'}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
