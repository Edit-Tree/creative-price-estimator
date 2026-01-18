
import React, { useState, useRef } from 'react';
import { ServiceRate, PricingSettings, HistoryItem, InvoiceInsight } from '../types';
import { analyzeInvoice } from '../services/gemini';

interface KnowledgeBaseProps {
  rates: ServiceRate[];
  setRates: (rates: ServiceRate[]) => void;
  settings: PricingSettings;
  setSettings: (settings: PricingSettings) => void;
  history: HistoryItem[];
  invoiceInsights: InvoiceInsight[];
  setInvoiceInsights: (insights: InvoiceInsight[]) => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  'INR': '₹',
  'EUR': '€',
  'USD': '$'
};

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ 
  rates, setRates, settings, setSettings, history, invoiceInsights, setInvoiceInsights 
}) => {
  const [showLearning, setShowLearning] = useState(false);
  const [invoiceInput, setInvoiceInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [filePreview, setFilePreview] = useState<{ url: string; name: string; type: string } | null>(null);
  const [base64File, setBase64File] = useState<{ data: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const [mimeInfo, data] = result.split(',');
        const mimeType = mimeInfo.match(/:(.*?);/)?.[1] || file.type;
        
        setFilePreview({ url: result, name: file.name, type: mimeType });
        setBase64File({ data, mimeType });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIngest = async () => {
    if (!invoiceInput.trim() && !base64File) return;
    setLoading(true);
    try {
      const newInsights = await analyzeInvoice(invoiceInput, base64File || undefined);
      setInvoiceInsights([...invoiceInsights, ...newInsights]);
      setInvoiceInput('');
      setFilePreview(null);
      setBase64File(null);
    } catch (err) {
      alert("Failed to analyze invoice.");
    } finally {
      setLoading(false);
    }
  };

  const approveInsight = (insight: InvoiceInsight) => {
    const existingRate = rates.find(r => r.name.toLowerCase() === insight.detectedName.toLowerCase());
    if (existingRate) {
      // Update existing
      setRates(rates.map(r => r.id === existingRate.id ? { 
        ...r, 
        currentRate: insight.detectedRate,
        currency: insight.detectedCurrency
      } : r));
    } else {
      // Add new category
      const newRate: ServiceRate = {
        id: crypto.randomUUID(),
        name: insight.detectedName,
        category: insight.detectedCategory,
        currentRate: insight.detectedRate,
        currency: insight.detectedCurrency,
        industryRate: insight.detectedRate * 1.5, // Conservative estimate
        unit: insight.detectedUnit,
      };
      setRates([...rates, newRate]);
    }
    setInvoiceInsights(invoiceInsights.filter(i => i.id !== insight.id));
  };

  const discardInsight = (id: string) => {
    setInvoiceInsights(invoiceInsights.filter(i => i.id !== id));
  };

  const updateRate = (id: string, field: keyof ServiceRate, value: any) => {
    setRates(rates.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const isPdf = filePreview?.type === 'application/pdf';

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 font-black">Knowledge Base</h2>
          <p className="text-slate-500 mt-2 font-medium">Standardize multipliers and learn from past billing patterns.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowLearning(!showLearning)}
            className={`px-6 py-3 rounded-2xl text-sm font-black shadow-lg transition-all flex items-center gap-2 ${showLearning ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 border border-slate-200'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            Learn from Invoices
          </button>
        </div>
      </header>

      {/* Invoice Ingestion Panel */}
      {showLearning && (
        <section className="bg-indigo-600 rounded-3xl p-8 text-white shadow-2xl animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/20 rounded-2xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <h3 className="text-xl font-black">AI Invoice Training</h3>
              <p className="text-indigo-100 text-sm">Now supports Text, Images, and PDFs from your past invoices.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-4">
              <textarea 
                value={invoiceInput}
                onChange={(e) => setInvoiceInput(e.target.value)}
                placeholder="e.g. 'Ads Design - 20 Euro', 'Reels - ₹3000'"
                className="w-full h-40 bg-white/10 border border-white/20 rounded-2xl p-5 text-white placeholder-indigo-300 focus:bg-white/20 outline-none transition-all resize-none"
              />
              <button 
                onClick={handleIngest}
                disabled={loading || (!invoiceInput.trim() && !base64File)}
                className="w-full bg-white text-indigo-600 font-black py-4 rounded-2xl hover:bg-slate-50 transition-all shadow-xl disabled:opacity-50"
              >
                {loading ? 'Analyzing Currency & Rates...' : 'Extract Data Points'}
              </button>
            </div>

            <div 
              onClick={() => !filePreview && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer transition-all ${filePreview ? 'border-white/50 bg-white/5' : 'border-white/20 hover:border-white/50 hover:bg-white/5'}`}
            >
              {filePreview ? (
                <div className="relative w-full h-40 flex flex-col items-center justify-center group">
                  {isPdf ? (
                    <div className="flex flex-col items-center gap-2">
                       <svg className="w-16 h-16 text-indigo-200" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" /><path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
                       <p className="text-xs font-bold text-white truncate max-w-[200px]">{filePreview.name}</p>
                    </div>
                  ) : (
                    <img src={filePreview.url} className="w-full h-full object-contain rounded-xl" />
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setFilePreview(null); setBase64File(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  <p className="font-bold text-sm">Upload Screenshot or PDF</p>
                  <p className="text-xs opacity-50">Images & PDF documents supported</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />
            </div>
          </div>

          {/* Pending Insights with Currency Selectors */}
          {invoiceInsights.length > 0 && (
            <div className="bg-white/10 rounded-3xl p-8 border border-white/20">
              <h4 className="font-black text-sm uppercase tracking-widest mb-6">Serious Review: Verify Rates & Currencies</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invoiceInsights.map(insight => (
                  <div key={insight.id} className="bg-white rounded-2xl p-5 shadow-sm group">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-500 px-2 py-1 rounded-lg">Source: "{insight.sourceLabel}"</span>
                        <select 
                          value={insight.detectedCurrency}
                          onChange={(e) => setInvoiceInsights(invoiceInsights.map(i => i.id === insight.id ? {...i, detectedCurrency: e.target.value as any} : i))}
                          className="text-[10px] font-black bg-slate-100 p-1 rounded border-none outline-none"
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="USD">USD ($)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase">Standardized Name</label>
                          <input 
                            type="text" 
                            value={insight.detectedName}
                            onChange={(e) => setInvoiceInsights(invoiceInsights.map(i => i.id === insight.id ? {...i, detectedName: e.target.value} : i))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-sm font-black text-slate-900"
                          />
                        </div>
                        <div className="text-right w-24">
                          <label className="text-[10px] font-black text-emerald-500 uppercase">Unit Rate</label>
                          <div className="flex items-center justify-end font-black text-lg text-slate-900">
                            <span>{CURRENCY_SYMBOLS[insight.detectedCurrency]}</span>
                            <input 
                              type="number"
                              value={insight.detectedRate}
                              onChange={(e) => setInvoiceInsights(invoiceInsights.map(i => i.id === insight.id ? {...i, detectedRate: parseInt(e.target.value)} : i))}
                              className="w-full bg-transparent border-none text-right outline-none"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold">/{insight.detectedUnit}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-50">
                        <button onClick={() => discardInsight(insight.id)} className="flex-1 px-4 py-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">Discard</button>
                        <button onClick={() => approveInsight(insight)} className="flex-2 bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg">Verify & Merge</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Global Settings */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8">
        <h3 className="text-xl font-black text-slate-900">Agency Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-50 p-4 rounded-2xl">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Domestic (x)</label>
            <input type="number" step="0.1" value={settings.agencyMultiplier} onChange={(e) => setSettings({ ...settings, agencyMultiplier: parseFloat(e.target.value) })} className="w-full bg-white font-black text-xl p-3 rounded-xl border border-slate-200" />
          </div>
          <div className="bg-indigo-50 p-4 rounded-2xl">
            <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">International (x)</label>
            <input type="number" step="0.1" value={settings.internationalMultiplier} onChange={(e) => setSettings({ ...settings, internationalMultiplier: parseFloat(e.target.value) })} className="w-full bg-white font-black text-xl p-3 rounded-xl border border-indigo-100" />
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Junior Cost (₹)</label>
            <input type="number" value={settings.juniorHourlyCost} onChange={(e) => setSettings({ ...settings, juniorHourlyCost: parseInt(e.target.value) })} className="w-full bg-white font-black text-xl p-3 rounded-xl border border-slate-200" />
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Senior Cost (₹)</label>
            <input type="number" value={settings.seniorHourlyCost} onChange={(e) => setSettings({ ...settings, seniorHourlyCost: parseInt(e.target.value) })} className="w-full bg-white font-black text-xl p-3 rounded-xl border border-slate-200" />
          </div>
        </div>
      </section>

      {/* Main Rate Card */}
      <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900">Service Rate Card</h3>
            <p className="text-sm text-slate-500">Base rates used as the foundation for all estimates.</p>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-black uppercase tracking-widest">Live Rates</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                <th className="px-8 py-5">Service Pattern</th>
                <th className="px-8 py-5 text-center">Currency</th>
                <th className="px-8 py-5 text-right">Base Rate</th>
                <th className="px-8 py-5 text-right font-bold text-emerald-600">Market Avg</th>
                <th className="px-8 py-5">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rates.map(rate => (
                <tr key={rate.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 font-black text-slate-900">
                    {rate.name}
                    <span className="block text-[10px] font-black uppercase text-indigo-400 mt-1">{rate.category}</span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <select 
                      value={rate.currency} 
                      onChange={(e) => updateRate(rate.id, 'currency', e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded p-1 text-[10px] font-black outline-none"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end font-black text-slate-900">
                      <span className="mr-1 opacity-40">{CURRENCY_SYMBOLS[rate.currency]}</span>
                      <input type="number" value={rate.currentRate} onChange={(e) => updateRate(rate.id, 'currentRate', parseInt(e.target.value))} className="w-24 p-2 text-right border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none" />
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end font-black text-emerald-700">
                      <span className="mr-1 opacity-40">{CURRENCY_SYMBOLS[rate.currency]}</span>
                      <input type="number" value={rate.industryRate} onChange={(e) => updateRate(rate.id, 'industryRate', parseInt(e.target.value))} className="w-24 p-2 text-right border-2 border-emerald-50 rounded-xl bg-emerald-50 outline-none" />
                    </div>
                  </td>
                  <td className="px-8 py-5 text-slate-400 italic font-medium">{rate.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
