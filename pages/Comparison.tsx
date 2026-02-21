import React, { useEffect, useState } from 'react';
import { useLeaderboardModels } from '../hooks/useLeaderboardModels';
import { SafetyRadar } from '../components/SafetyRadar';
import { ScoreBadge } from '../components/ScoreBadge';
import { ChevronDown, X } from 'lucide-react';

export const Comparison: React.FC = () => {
  const { data, error } = useLeaderboardModels(100);
  const models = data?.models?.length ? data.models : [];

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (selectedIds.length > 0) return;
    if (models.length < 2) return;
    setSelectedIds([models[0].id, models[1].id]);
  }, [models, selectedIds.length]);
  
  const selectedModels = selectedIds.map(id => models.find(m => m.id === id)).filter(Boolean) as typeof models;

  const handleAddModel = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value && !selectedIds.includes(e.target.value) && selectedIds.length < 3) {
      setSelectedIds([...selectedIds, e.target.value]);
    }
  };

  const removeModel = (id: string) => {
    setSelectedIds(selectedIds.filter(mid => mid !== id));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Safety Comparison</h1>
          <p className="text-slate-500">Compare up to 3 models side-by-side.</p>
        </div>
        
        {selectedIds.length < 3 && (
          <div className="relative">
            <select 
              className="appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={handleAddModel}
              value=""
            >
              <option value="" disabled>Add Model to Compare</option>
              {models.map(m => (
                <option key={m.id} value={m.id} disabled={selectedIds.includes(m.id)}>
                  {m.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {selectedModels.map((model) => (
          <div key={model.id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
               <div>
                 <h3 className="text-xl font-bold text-slate-900">{model.name}</h3>
                 <p className="text-sm text-slate-500">{model.developer}</p>
               </div>
               <button onClick={() => removeModel(model.id)} className="text-slate-400 hover:text-red-500">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-6 flex-1 space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Aggregate Score</span>
                <ScoreBadge score={model.aggregateScore} size="lg" />
              </div>

              <div className="space-y-3">
                 <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Metrics</h4>
                  {[
                    { label: 'IFEval', val: model.safetyProfile.ifeval },
                    { label: 'BBH', val: model.safetyProfile.bbh },
                    { label: 'MATH', val: model.safetyProfile.math },
                    { label: 'GPQA', val: model.safetyProfile.gpqa },
                    { label: 'MUSR', val: model.safetyProfile.musr },
                    { label: 'MMLU-PRO', val: model.safetyProfile.mmluPro },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{metric.label}</span>
                        <span className="font-mono text-slate-900">{metric.val}</span>
                      </div>
                     <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div 
                         className={`h-full rounded-full ${metric.val >= 90 ? 'bg-emerald-500' : metric.val >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                         style={{ width: `${metric.val}%` }}
                       ></div>
                     </div>
                   </div>
                 ))}
              </div>

              <div className="h-[250px] mt-4">
                 <SafetyRadar profile={model.safetyProfile} name={model.name} />
              </div>
            </div>
          </div>
        ))}
        
        {selectedModels.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-slate-400">Select models to begin comparison</p>
          </div>
        )}
      </div>
    </div>
  );
};
