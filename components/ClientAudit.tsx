
import React, { useState } from 'react';
import { Brand, WorkLog, ServiceRate } from '../types';

interface ClientAuditProps {
  brands: Brand[];
  workLogs: WorkLog[];
  setWorkLogs: (logs: WorkLog[]) => void;
  rates: ServiceRate[];
  onUpdateBrand: (brand: Brand) => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = { 'INR': '₹', 'EUR': '€', 'USD': '$' };

export const ClientAudit: React.FC<ClientAuditProps> = ({ brands, workLogs, setWorkLogs, rates, onUpdateBrand }) => {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  const selectedBrand = brands.find(b => b.id === selectedBrandId);
  const brandLogs = workLogs.filter(l => l.brandId === selectedBrandId);

  const getHealthStatus = (brand: Brand) => {
    const logs = workLogs.filter(l => l.brandId === brand.id);
    if (logs.length === 0) return 'neutral';
    const lastLog = logs[logs.length - 1];
    return lastLog.health.toLowerCase();
  };

  const calculateEffectiveMonthlyPay = (brand: Brand) => {
    const logs = workLogs.filter(l => l.brandId === brand.id);
    if (logs.length === 0) return brand.monthlyRetainerFee || 0;
    
    const recentLogs = logs.slice(-6); // Analyze last 6 entries
    const totalBilled = recentLogs.reduce((sum, log) => sum + (log.actualBilled || 0), 0);
    const totalMonths = recentLogs.reduce((sum, log) => sum + (log.periodMonths || 1), 0);
    
    return totalBilled / (totalMonths || 1);
  };

  const deleteLog = (logId: string) => {
    if (window.confirm("Are you sure? This will remove this data point from the brand's performance history.")) {
      setWorkLogs(workLogs.filter(l => l.id !== logId));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-slate-900">Portfolio Profitability Audit</h2>
        <p className="text-slate-500 mt-2 font-medium">Standardized monthly revenue averaged from {workLogs.length} historical data points.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {brands.map(brand => {
          const health = getHealthStatus(brand);
          const effectivePay = calculateEffectiveMonthlyPay(brand);
          return (
            <div 
              key={brand.id} 
              onClick={() => setSelectedBrandId(brand.id)}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer group"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{brand.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    health === 'loss' ? 'bg-red-100 text-red-600' : 
                    health === 'warning' ? 'bg-amber-100 text-amber-600' : 
                    health === 'healthy' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {health === 'neutral' ? 'No Data' : health}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1 font-medium">{brand.billingModel} • {brand.region}</p>
              </div>

              <div className="flex flex-col md:items-end space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Averaged Revenue</p>
                <div className="flex items-baseline gap-1">
                   <span className="text-2xl font-black text-slate-900">{CURRENCY_SYMBOLS[brand.currency]}{(Math.round(effectivePay) || 0).toLocaleString()}</span>
                   <span className="text-[10px] text-slate-400 font-bold">/mo</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drill Down Modal - FIXED SCROLLING */}
      {selectedBrand && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex justify-center items-start p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-[40px] p-6 md:p-10 shadow-2xl my-8 relative flex flex-col">
            <header className="flex justify-between items-start mb-10 pb-6 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-4xl font-black text-slate-900">{selectedBrand.name} Audit</h3>
                <p className="text-slate-500 font-medium mt-1">Manage historical logs and refine billing assumptions.</p>
              </div>
              <button onClick={() => setSelectedBrandId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 shrink-0">
              <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Contract Configuration</h4>
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Standard Retainer Fee ({selectedBrand.currency})</label>
                    <input 
                      type="number" 
                      value={selectedBrand.monthlyRetainerFee || 0} 
                      onChange={(e) => onUpdateBrand({...selectedBrand, monthlyRetainerFee: parseInt(e.target.value) || 0})}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2 font-black text-lg w-full outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Stated Scope Limit</label>
                    <textarea 
                      value={selectedBrand.retainerScopeLimit || ''} 
                      onChange={(e) => onUpdateBrand({...selectedBrand, retainerScopeLimit: e.target.value})}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium w-full h-24 resize-none outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-indigo-600 p-8 rounded-[32px] text-white shadow-xl shadow-indigo-100">
                  <h4 className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-2">Calculated Performance</h4>
                  <p className="text-3xl font-black">{CURRENCY_SYMBOLS[selectedBrand.currency]}{(Math.round(calculateEffectiveMonthlyPay(selectedBrand)) || 0).toLocaleString()}</p>
                  <p className="text-xs opacity-80 mt-2 font-medium">This averages your last 6 months of logged data (Retainer + Overages).</p>
                </div>

                <div className={`p-8 rounded-[32px] ${getHealthStatus(selectedBrand) === 'loss' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  <h4 className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-2">Deal Health</h4>
                  <p className="text-2xl font-black uppercase tracking-widest">{getHealthStatus(selectedBrand)}</p>
                  <p className="text-sm opacity-80 mt-1 italic">
                    {brandLogs.length > 0 ? brandLogs[brandLogs.length - 1].aiInsight : "No log data."}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <h4 className="text-xl font-black text-slate-900 mb-6">Log History (Manage data points)</h4>
              <div className="space-y-3">
                {brandLogs.length > 0 ? brandLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 hover:border-indigo-100 group transition-all">
                    <div>
                      <p className="font-black text-slate-900">{log.month}</p>
                      <p className="text-[10px] font-black text-indigo-500 uppercase">
                        {log.periodMonths} mo billing • {log.deliverables.length} Deliverables
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-black text-slate-900">{CURRENCY_SYMBOLS[selectedBrand.currency]}{(log.actualBilled || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {(log.overageTotal || 0) > 0 ? `+${CURRENCY_SYMBOLS[selectedBrand.currency]}${(log.overageTotal || 0).toLocaleString()} Extra` : 'Retainer Only'}
                        </p>
                      </div>
                      <button 
                        onClick={() => deleteLog(log.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold">No data points yet. Calculation uses the base retainer fee.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
