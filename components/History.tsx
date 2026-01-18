
import React from 'react';
import { HistoryItem } from '../types';

interface HistoryProps {
  history: HistoryItem[];
  onDelete: (id: string) => void;
}

export const History: React.FC<HistoryProps> = ({ history, onDelete }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Estimation History</h2>
        <p className="text-slate-500 mt-2">Past calculations that help train the agency's AI pricing model.</p>
      </header>

      {history.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-20 text-center">
          <p className="text-slate-400">No saved history yet. Start by generating an estimate.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {history.slice().reverse().map(item => (
            <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-900">{item.clientName}</h3>
                  <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full ${item.region === 'International' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                    {item.region}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {new Date(item.timestamp).toLocaleDateString()} • {item.finalEstimate.items.length} items
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Final Quote</p>
                  <p className="text-xl font-black text-slate-900">
                    {item.finalEstimate.currency === 'EUR' ? '€' : '₹'}{item.finalEstimate.totalEstimate?.toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={() => onDelete(item.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
