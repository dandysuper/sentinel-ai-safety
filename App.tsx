import React from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Shield, Scale, BookOpen, Settings as SettingsIcon } from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { ModelDetail } from './pages/ModelDetail';
import { Comparison } from './pages/Comparison';
import { Benchmarks } from './pages/Benchmarks';
import { Settings } from './pages/Settings';
import { useLeaderboardModels } from './hooks/useLeaderboardModels';

const NavBar: React.FC = () => {
  const location = useLocation();
  const { data } = useLeaderboardModels(100);
  const isActive = (path: string) => location.pathname === path ? "text-blue-600 bg-blue-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50";

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">Sentinel</span>
            </Link>
            <div className="hidden sm:ml-10 sm:flex sm:space-x-4 items-center">
              <Link to="/" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/')}`}>
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" /> Dashboard
                </div>
              </Link>
              <Link to="/compare" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/compare')}`}>
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4" /> Compare
                </div>
              </Link>
              <Link to="/benchmarks" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/benchmarks')}`}>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Benchmarks
                </div>
              </Link>
              <Link to="/settings" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/settings')}`}>
                <div className="flex items-center gap-2">
                  <SettingsIcon className="w-4 h-4" /> Settings
                </div>
              </Link>
            </div>
          </div>
          <div className="flex items-center">
             <div className="text-xs text-slate-400 hidden md:block">
               Data Updated: {data?.sourceUpdatedAt || '-'}
             </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Footer: React.FC = () => (
  <footer className="bg-slate-50 border-t border-slate-200 mt-auto">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-slate-500 text-sm">
          © 2024 Sentinel AI Safety. Data aggregated from public benchmarks.
        </div>
        <div className="flex gap-6 text-sm text-slate-500">
          <Link to="/benchmarks" className="hover:text-slate-900">Benchmarks</Link>
          <Link to="/settings" className="hover:text-slate-900">Settings</Link>
          <a href="https://open-llm-leaderboard-open-llm-leaderboard.hf.space/api/leaderboard/formatted" className="hover:text-slate-900" target="_blank" rel="noreferrer">API</a>
          <a href="https://www.promptfoo.dev/blog/top-llm-safety-bias-benchmarks/" className="hover:text-slate-900" target="_blank" rel="noreferrer">Sources</a>
        </div>
      </div>
    </div>
  </footer>
);

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-slate-50/50">
        <NavBar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/model/:id" element={<ModelDetail />} />
            <Route path="/compare" element={<Comparison />} />
            <Route path="/benchmarks" element={<Benchmarks />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  );
}
