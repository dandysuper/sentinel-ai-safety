import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useLeaderboardModels } from '../hooks/useLeaderboardModels';
import { FilterState, SortField, SortOrder } from '../types';
import { ScoreBadge } from '../components/ScoreBadge';
import { Sparkline } from '../components/Sparkline';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useLeaderboardModels(100);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: 'All',
    minScore: 0,
  });
  const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({
    field: 'rank',
    order: 'asc',
  });

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredModels = useMemo(() => {
    const base = data?.models?.length ? data.models : [];
    let result = [...base];

    if (filters.search) {
      result = result.filter(m => m.name.toLowerCase().includes(filters.search.toLowerCase()));
    }
    if (filters.type !== 'All') {
      result = result.filter(m => m.type === filters.type);
    }
    if (filters.minScore > 0) {
      result = result.filter(m => m.aggregateScore >= filters.minScore);
    }

    result.sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];
      if (aValue < bValue) return sortConfig.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data?.models, error, filters, sortConfig]);

  const topSafe = filteredModels.length
    ? [...filteredModels].sort((a, b) => b.aggregateScore - a.aggregateScore)[0]
    : undefined;
  const mostRisky = filteredModels.length
    ? [...filteredModels].sort((a, b) => a.aggregateScore - b.aggregateScore)[0]
    : undefined;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-emerald-800 font-semibold uppercase tracking-wider text-xs mb-1">Самая безопасная модель</h3>
            <div className="text-2xl font-bold text-slate-900">{topSafe?.name || (isLoading ? 'Загрузка...' : '-')}</div>
            <div className="text-sm text-slate-500">{topSafe?.developer || ' '}</div>
          </div>
          <div className="text-right">
             <div className="text-4xl font-bold text-emerald-600">{topSafe ? topSafe.aggregateScore.toFixed(1) : '-'}</div>
             <ShieldCheck className="inline-block w-6 h-6 text-emerald-500 mt-1" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-100 rounded-xl p-6 shadow-sm flex items-center justify-between">
           <div>
            <h3 className="text-rose-800 font-semibold uppercase tracking-wider text-xs mb-1">Наименьший балл безопасности</h3>
            <div className="text-2xl font-bold text-slate-900">{mostRisky?.name || (isLoading ? 'Загрузка...' : '-')}</div>
            <div className="text-sm text-slate-500">{mostRisky?.developer || ' '}</div>
          </div>
          <div className="text-right">
             <div className="text-4xl font-bold text-rose-600">{mostRisky ? mostRisky.aggregateScore.toFixed(1) : '-'}</div>
             <AlertTriangle className="inline-block w-6 h-6 text-rose-500 mt-1" />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900 text-sm">
          Не удалось загрузить данные бенчмарков.
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <div className="w-full lg:w-64 space-y-6 flex-shrink-0">
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm sticky top-24">
            <div className="flex items-center gap-2 mb-4 text-slate-900 font-semibold">
              <Filter className="w-4 h-4" /> Фильтры
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Поиск модели</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="напр. GPT-4"
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Тип доступа</label>
                <div className="flex bg-slate-100 p-1 rounded-md">
                  {['All', 'Open', 'Closed'].map((type) => {
                    const labels: Record<string, string> = { 'All': 'Все', 'Open': 'Открытые', 'Closed': 'Закрытые' };
                    return (
                    <button
                      key={type}
                      onClick={() => setFilters({...filters, type: type as any})}
                      className={`flex-1 text-xs py-1.5 rounded-sm font-medium transition-colors ${
                        filters.type === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {labels[type]}
                    </button>
                  );})}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Мин. балл безопасности: {filters.minScore}</label>
                <input 
                  type="range" 
                  min="0" 
                  max="90" 
                  step="5"
                  value={filters.minScore}
                  onChange={(e) => setFilters({...filters, minScore: parseInt(e.target.value)})}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-4 font-semibold cursor-pointer hover:text-slate-700" onClick={() => handleSort('rank')}>Ранг</th>
                  <th className="p-4 font-semibold cursor-pointer hover:text-slate-700" onClick={() => handleSort('name')}>Название модели</th>
                  <th className="p-4 font-semibold">Тип</th>
                  <th className="p-4 font-semibold cursor-pointer hover:text-slate-700 text-right" onClick={() => handleSort('aggregateScore')}>Балл безопасности</th>
                  <th className="p-4 font-semibold text-right">Тренд за 7 дней</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredModels.map((model) => (
                  <tr 
                    key={model.id} 
                    onClick={() => navigate(`/model/${model.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="p-4 text-slate-500 font-mono">#{model.rank}</td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{model.name}</div>
                      <div className="text-xs text-slate-500">{model.developer}</div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded border ${
                        model.type === 'Open' 
                          ? 'bg-purple-50 text-purple-700 border-purple-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {model.type}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <ScoreBadge score={model.aggregateScore} />
                    </td>
                    <td className="p-4">
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
              <div className="p-12 text-center text-slate-500">
                 {isLoading ? 'Загрузка рейтинга...' : 'Модели не найдены по заданным критериям.'}
              </div>
           )}
        </div>
      </div>
    </div>
  );
};
