
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

const CATEGORIES: ServiceRate['category'][] = ['Design', 'Video', 'Motion', 'Strategy', 'Other'];

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  rates, setRates, settings, setSettings, history, invoiceInsights, setInvoiceInsights
}) => {
  const [showLearning, setShowLearning] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [invoiceInput, setInvoiceInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [filePreview, setFilePreview] = useState<{ url: string; name: string; type: string } | null>(null);
  const [base64File, setBase64File] = useState<{ data: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Add Form State
  const [newRate, setNewRate] = useState<Partial<ServiceRate>>({
    name: '',
    category: 'Other',
    currentRate: 0,
    industryRate: 0,
    currency: 'INR',
    unit: 'per unit'
  });

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

  const handleAddManualRate = () => {
    if (!newRate.name || !newRate.currentRate) {
      alert("Please provide at least a service name and a rate.");
      return;
    }

    const rate: ServiceRate = {
      id: crypto.randomUUID(),
      name: newRate.name,
      category: newRate.category as any || 'Other',
      currentRate: newRate.currentRate,
      currency: newRate.currency as any || 'INR',
      industryRate: newRate.industryRate || newRate.currentRate * 1.5,
      unit: newRate.unit || 'per unit',
    };

    setRates([...rates, rate]);
    setNewRate({
      name: '',
      category: 'Other',
      currentRate: 0,
      industryRate: 0,
      currency: 'INR',
      unit: 'per unit'
    });
    setShowManualAdd(false);
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
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 font-black">Knowledge Base</h2>
          <p className="text-slate-500 mt-2 font-medium">Standardize multipliers and learn from past billing patterns.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowLearning(!showLearning); setShowManualAdd(false); }}
            className={`px-6 py-3 rounded-2xl text-sm font-black shadow-lg transition-all flex items-center gap-2 ${showLearning ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            AI Learning
          </button>
          <button
            onClick={() => { setShowManualAdd(!showManualAdd); setShowLearning(false); }}
            className={`px-6 py-3 rounded-2xl text-sm font-black shadow-lg transition-all flex items-center gap-2 ${showManualAdd ? 'bg-slate-900 text-white shadow-slate-100' : 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Manually
          </button>
        </div>
      </header>

      {/* Manual Add Section */}
      {showManualAdd && (
        <section className="bg-white border-2 border-slate-900 rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-top-4 duration-500">
          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full" />
            Define New Standard Service
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Name</label>
              <input
                type="text"
                placeholder="e.g. Premium Branding"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none focus:border-indigo-500 transition-all"
                value={newRate.name}
                onChange={e => setNewRate({ ...newRate, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none focus:border-indigo-500"
                value={newRate.category}
                onChange={e => setNewRate({ ...newRate, category: e.target.value as any })}
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit of Measure</label>
              <input
                type="text"
                placeholder="e.g. per project"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none focus:border-indigo-500"
                value={newRate.unit}
                onChange={e => setNewRate({ ...newRate, unit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Rate</label>
              <div className="flex">
                <select
                  className="bg-slate-200 px-3 py-3 rounded-l-xl font-black border-r border-slate-300"
                  value={newRate.currency}
                  onChange={e => setNewRate({ ...newRate, currency: e.target.value as any })}
                >
                  <option value="INR">₹</option>
                  <option value="EUR">€</option>
                  <option value="USD">$</option>
                </select>
                <input
                  type="number"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-r-xl px-4 py-3 font-black outline-none focus:border-indigo-500"
                  value={newRate.currentRate || ''}
                  onChange={e => setNewRate({ ...newRate, currentRate: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Industry Average</label>
              <input
                type="number"
                placeholder="Market Price"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none focus:border-indigo-500"
                value={newRate.industryRate || ''}
                onChange={e => setNewRate({ ...newRate, industryRate: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddManualRate}
                className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
              >
                Confirm Service
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Invoice Ingestion Panel */}
      {showLearning && (
        <section className="bg-indigo-600 rounded-[32px] p-8 text-white shadow-2xl animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/20 rounded-2xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <h3 className="text-xl font-black">AI Invoice Training</h3>
              <p className="text-indigo-100 text-sm">Standardize your knowledge by uploading past proof-of-work.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-4">
              <textarea
                value={invoiceInput}
                onChange={(e) => setInvoiceInput(e.target.value)}
                placeholder="e.g. 'Social Media Reels - ₹5000', 'Logo Design - €500'"
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
                  <p className="text-xs opacity-50">Proofs of past billing</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />
            </div>
          </div>

          {/* Pending Insights Review */}
          {invoiceInsights.length > 0 && (
            <div className="bg-white/10 rounded-3xl p-8 border border-white/20">
              <h4 className="font-black text-sm uppercase tracking-widest mb-6">Unverified Discoveries</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invoiceInsights.map(insight => (
                  <div key={insight.id} className="bg-white rounded-2xl p-5 shadow-sm group">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-500 px-2 py-1 rounded-lg">From: "{insight.sourceLabel}"</span>
                        <select
                          value={insight.detectedCurrency}
                          onChange={(e) => setInvoiceInsights(invoiceInsights.map(i => i.id === insight.id ? { ...i, detectedCurrency: e.target.value as any } : i))}
                          className="text-[10px] font-black bg-slate-100 p-1 rounded border-none outline-none"
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="USD">USD ($)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase">Service Key</label>
                          <input
                            type="text"
                            value={insight.detectedName}
                            onChange={(e) => setInvoiceInsights(invoiceInsights.map(i => i.id === insight.id ? { ...i, detectedName: e.target.value } : i))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-sm font-black text-slate-900"
                          />
                        </div>
                        <div className="text-right w-24">
                          <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Rate</label>
                          <div className="flex items-center justify-end font-black text-lg text-slate-900">
                            <span>{CURRENCY_SYMBOLS[insight.detectedCurrency]}</span>
                            <input
                              type="number"
                              value={insight.detectedRate}
                              onChange={(e) => setInvoiceInsights(invoiceInsights.map(i => i.id === insight.id ? { ...i, detectedRate: parseInt(e.target.value) } : i))}
                              className="w-full bg-transparent border-none text-right outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-50">
                        <button onClick={() => discardInsight(insight.id)} className="flex-1 px-4 py-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">Discard</button>
                        <button onClick={() => approveInsight(insight)} className="flex-2 bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg">Merge into Deck</button>
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
      <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 space-y-8">
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Agency Multipliers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Domestic (x)</label>
            <input type="number" step="0.1" value={settings.agencyMultiplier} onChange={(e) => setSettings({ ...settings, agencyMultiplier: parseFloat(e.target.value) })} className="w-full bg-white font-black text-2xl p-3 rounded-xl border border-slate-200" />
          </div>
          <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
            <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">International (x)</label>
            <input type="number" step="0.1" value={settings.internationalMultiplier} onChange={(e) => setSettings({ ...settings, internationalMultiplier: parseFloat(e.target.value) })} className="w-full bg-white font-black text-2xl p-3 rounded-xl border border-indigo-200" />
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Junior Cost (₹)</label>
            <input type="number" value={settings.juniorHourlyCost} onChange={(e) => setSettings({ ...settings, juniorHourlyCost: parseInt(e.target.value) })} className="w-full bg-white font-black text-2xl p-3 rounded-xl border border-slate-200" />
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Senior Cost (₹)</label>
            <input type="number" value={settings.seniorHourlyCost} onChange={(e) => setSettings({ ...settings, seniorHourlyCost: parseInt(e.target.value) })} className="w-full bg-white font-black text-2xl p-3 rounded-xl border border-slate-200" />
          </div>
        </div>
      </section>

      {/* Main Rate Card */}
      <section className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900">Standard Service Deck</h3>
            <p className="text-sm text-slate-500">Live base rates across your agency offerings.</p>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-black uppercase tracking-widest">Master Deck</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                <th className="px-8 py-5">Service Pattern</th>
                <th className="px-8 py-5 text-center">Currency</th>
                <th className="px-8 py-5 text-right">Agency Rate</th>
                <th className="px-8 py-5 text-right font-bold text-emerald-600">Industry Avg</th>
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
                      className="bg-slate-50 border border-slate-200 rounded p-2 text-[10px] font-black outline-none"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end font-black text-slate-900">
                      <span className="mr-1 opacity-40">{CURRENCY_SYMBOLS[rate.currency]}</span>
                      <input type="number" value={rate.currentRate} onChange={(e) => updateRate(rate.id, 'currentRate', parseInt(e.target.value))} className="w-24 p-2 text-right border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-black" />
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end font-black text-emerald-700">
                      <span className="mr-1 opacity-40">{CURRENCY_SYMBOLS[rate.currency]}</span>
                      <input type="number" value={rate.industryRate} onChange={(e) => updateRate(rate.id, 'industryRate', parseInt(e.target.value))} className="w-24 p-2 text-right border-2 border-emerald-50 rounded-xl bg-emerald-50 outline-none font-black" />
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
