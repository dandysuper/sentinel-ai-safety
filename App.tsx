import React, { useState } from "react";
import { HashRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Shield,
  Scale,
  BookOpen,
  Settings as SettingsIcon,
  Menu,
  X,
} from "lucide-react";
import { Dashboard } from "./pages/Dashboard";
import { ModelDetail } from "./pages/ModelDetail";
import { Comparison } from "./pages/Comparison";
import { Benchmarks } from "./pages/Benchmarks";
import { Settings } from "./pages/Settings";
import { useLeaderboardModels } from "./hooks/useLeaderboardModels";

const NAV_LINKS = [
  { to: "/", icon: LayoutGrid, label: "Панель" },
  { to: "/compare", icon: Scale, label: "Сравнение" },
  { to: "/benchmarks", icon: BookOpen, label: "Бенчмарки" },
  { to: "/settings", icon: SettingsIcon, label: "Настройки" },
];

const NavBar: React.FC = () => {
  const location = useLocation();
  const { data } = useLeaderboardModels(100);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) =>
    location.pathname === path
      ? "text-blue-600 bg-blue-50"
      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50";

  const isMobileActive = (path: string) =>
    location.pathname === path
      ? "text-blue-600 bg-blue-50 border-l-2 border-blue-600"
      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-l-2 border-transparent";

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link
                to="/"
                className="flex-shrink-0 flex items-center gap-2"
                onClick={closeMobile}
              >
                <div className="bg-blue-600 p-1.5 rounded-lg">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="font-bold text-lg sm:text-xl text-slate-900 tracking-tight">
                  Sentinel
                </span>
              </Link>

              {/* Desktop nav links */}
              <div className="hidden sm:ml-8 sm:flex sm:space-x-1 items-center">
                {NAV_LINKS.map(({ to, icon: Icon, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(to)}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-4 h-4" />
                      {label}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-400 hidden md:block">
                Данные обновлены: {data?.sourceUpdatedAt || "—"}
              </div>

              {/* Hamburger — mobile only */}
              <button
                className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Открыть меню"
                onClick={() => setMobileOpen((prev) => !prev)}
              >
                {mobileOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        <div
          className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-white border-t border-slate-100 px-4 py-3 space-y-1">
            {NAV_LINKS.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                onClick={closeMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isMobileActive(to)}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            ))}

            {data?.sourceUpdatedAt && (
              <p className="text-xs text-slate-400 px-3 pt-2 pb-1">
                Данные обновлены: {data.sourceUpdatedAt}
              </p>
            )}
          </div>
        </div>
      </nav>

      {/* Backdrop — closes drawer when tapping outside */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 sm:hidden"
          aria-hidden="true"
          onClick={closeMobile}
        />
      )}
    </>
  );
};

const Footer: React.FC = () => (
  <footer className="bg-slate-50 border-t border-slate-200 mt-auto">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-slate-500 text-sm text-center sm:text-left">
          © 2024 Sentinel AI Safety. Данные агрегированы из публичных
          бенчмарков.
        </div>
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-slate-500">
          <Link
            to="/benchmarks"
            className="hover:text-slate-900 transition-colors"
          >
            Бенчмарки
          </Link>
          <Link
            to="/settings"
            className="hover:text-slate-900 transition-colors"
          >
            Настройки
          </Link>
          <a
            href="https://open-llm-leaderboard-open-llm-leaderboard.hf.space/api/leaderboard/formatted"
            className="hover:text-slate-900 transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            API
          </a>
          <a
            href="https://www.promptfoo.dev/blog/top-llm-safety-bias-benchmarks/"
            className="hover:text-slate-900 transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            Источники
          </a>
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
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
