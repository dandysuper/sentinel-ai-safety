import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2, Download, Bot, CheckCircle } from 'lucide-react';
import { useLeaderboardModels } from '../hooks/useLeaderboardModels';
import { generateSafetyAnalysis } from '../services/geminiService';
import { ScoreBadge } from '../components/ScoreBadge';
import { SafetyRadar } from '../components/SafetyRadar';
import { Sparkline } from '../components/Sparkline';

export const ModelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useLeaderboardModels(100);
  const models = data?.models?.length ? data.models : [];
  const model = models.find((m) => m.id === id);
  const [analysis, setAnalysis] = useState<string>('');
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    // Reset analysis when model changes
    setAnalysis('');
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
        <div className="p-10 text-center text-slate-500">Загрузка модели...</div>
      );
    }

    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold text-slate-800">Модель не найдена</h2>
        <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">Вернуться на главную</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Назад к панели
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-bold text-slate-900">{model.name}</h1>
             <span className={`text-xs px-2 py-0.5 rounded border ${model.type === 'Open' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {model.type === 'Open' ? 'Открытый' : 'Закрытый'} источник
             </span>
          </div>
          <div className="text-slate-500 mt-1">Разработчик: <span className="font-medium text-slate-700">{model.developer}</span> • {model.params} параметров</div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Балл безопасности</div>
            <ScoreBadge score={model.aggregateScore} size="lg" />
          </div>
          <div className="h-10 w-px bg-slate-200 hidden md:block"></div>
          <div className="hidden md:block">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Тренд</div>
            <Sparkline data={model.trend} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Visualizations */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
           <h3 className="text-lg font-semibold text-slate-800 mb-6">Профиль безопасности</h3>
            <div className="h-[400px] w-full">
              <SafetyRadar
                profile={model.safetyProfile}
                compareProfile={data?.leaderboardAverage}
                name={model.name}
                compareName={data?.leaderboardAverage ? 'Ср. по рейтингу' : undefined}
              />
            </div>
            <div className="mt-4 flex justify-center text-sm text-slate-500 gap-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 opacity-50"></span> {model.name}
              </div>
              {data?.leaderboardAverage && (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-300 opacity-50"></span> Ср. по рейтингу
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
             <h3 className="text-lg font-semibold text-slate-800 mb-4">Разбивка по источникам</h3>
             <div className="overflow-hidden rounded-lg border border-slate-200">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-slate-500">
                   <tr>
                     <th className="p-3 font-medium">Источник</th>
                     <th className="p-3 font-medium">Метрика</th>
                     <th className="p-3 font-medium text-right">Балл</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {model.sources.length > 0 ? model.sources.map((src, idx) => (
                     <tr key={idx}>
                       <td className="p-3 text-slate-900 font-medium">{src.source}</td>
                       <td className="p-3 text-slate-600">{src.metric}</td>
                       <td className="p-3 text-right">
                         <span className="font-mono">{src.score}/{src.maxScore}</span>
                       </td>
                     </tr>
                   )) : (
                     <tr><td colSpan={3} className="p-4 text-center text-slate-400">Данные внешних источников отсутствуют</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* Right Col: AI Analysis & Actions */}
        <div className="space-y-6">
           {/* Gemini Analysis Card */}
           <div className="bg-gradient-to-b from-indigo-50 to-white rounded-xl border border-indigo-100 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-indigo-900">ИИ-аналитик безопасности</h3>
              </div>
              
              {!analysis ? (
                <div className="text-center py-8">
                   <p className="text-indigo-800/70 text-sm mb-4">
                     Сгенерировать качественный анализ с помощью Gemini 3 Flash.
                   </p>
                  <button 
                    onClick={handleGenerateAnalysis}
                    disabled={loadingAnalysis}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loadingAnalysis ? 'Анализ...' : 'Сгенерировать отчёт'}
                  </button>
                </div>
              ) : (
                <div className="animate-in fade-in duration-500">
                  <div className="prose prose-sm prose-indigo text-slate-700">
                    {analysis.split('\n').map((para, i) => para.trim() && <p key={i} className="mb-2">{para}</p>)}
                  </div>
                  <div className="mt-4 pt-4 border-t border-indigo-100 flex items-center gap-2 text-xs text-indigo-500">
                    <CheckCircle className="w-3 h-3" /> Анализ сгенерирован Gemini 3
                  </div>
                </div>
              )}
           </div>

           <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Подробности</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Выпущена</dt>
                  <dd className="font-medium text-slate-900">{model.releaseDate}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Лицензия</dt>
                  <dd className="font-medium text-slate-900">{model.license || (model.type === 'Open' ? 'Открытая' : 'Проприетарная')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Параметры</dt>
                  <dd className="font-medium text-slate-900">{model.params}</dd>
                </div>
              </dl>
              <div className="mt-6 flex gap-2">
                <button className="flex-1 border border-slate-200 rounded-md py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" /> Поделиться
                </button>
                <button className="flex-1 border border-slate-200 rounded-md py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Экспорт
                </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
