
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'estimator' | 'knowledge' | 'audit' | 'history' | 'brands';
  setActiveTab: (tab: 'estimator' | 'knowledge' | 'audit' | 'history' | 'brands') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <nav className="w-full md:w-64 bg-white border-r border-slate-200 p-6 space-y-8 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            CreativeScale
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">Agency Optimizer</p>
        </div>

        <div className="space-y-2">
          {[
            { id: 'estimator', label: 'Estimator' },
            { id: 'brands', label: 'Brand Intelligence' },
            { id: 'history', label: 'History' },
            { id: 'audit', label: 'Client Audit' },
            { id: 'knowledge', label: 'Knowledge Base' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all capitalize ${
                activeTab === tab.id 
                ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pt-8 border-t border-slate-100">
          <div className="bg-slate-900 rounded-2xl p-4 text-white">
            <p className="text-sm font-medium">Memory Mode</p>
            <p className="text-xs text-slate-400 mt-1">AI now builds brand-specific rate databases.</p>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 md:p-10 bg-[#fbfcfd]">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
