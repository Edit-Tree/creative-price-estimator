
import React, { useState, useRef } from 'react';
import { estimatePricing } from '../services/gemini';
import { PricingSettings, ServiceRate, EstimateResponse, HistoryItem, Brand } from '../types';

interface EstimatorProps {
  settings: PricingSettings;
  rates: ServiceRate[];
  history: HistoryItem[];
  onSaveHistory: (item: HistoryItem) => void;
  brands: Brand[];
}

export const Estimator: React.FC<EstimatorProps> = ({ settings, rates, history, onSaveHistory, brands }) => {
  const [input, setInput] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('new');
  const [region, setRegion] = useState<'India' | 'International'>('India');
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [proposedEstimate, setProposedEstimate] = useState<EstimateResponse | null>(null);
  const [refinementText, setRefinementText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<{ data: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        const [mimeInfo, data] = result.split(',');
        const mimeType = mimeInfo.match(/:(.*?);/)?.[1] || 'image/jpeg';
        setBase64Image({ data, mimeType });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInitialEstimate = async () => {
    if (!input.trim() && !base64Image) return;
    setLoading(true);
    setProposedEstimate(null);
    const brand = brands.find(b => b.id === selectedBrandId);
    try {
      const res = await estimatePricing(
        input, 
        settings, 
        rates, 
        brand?.region || region, 
        history, 
        base64Image || undefined,
        brand
      );
      setEstimate(res);
    } catch (err) {
      alert("Error generating estimate.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    const baseContext = proposedEstimate || estimate;
    if (!refinementText.trim() || !baseContext) return;
    setLoading(true);
    try {
      const brand = brands.find(b => b.id === selectedBrandId);
      const res = await estimatePricing(
        input, 
        settings, 
        rates, 
        brand?.region || region, 
        history, 
        undefined, 
        brand
      );
      setProposedEstimate(res);
      setRefinementText('');
    } catch (err) {
      alert("Error refining estimate.");
    } finally {
      setLoading(false);
    }
  };

  const applyRefinement = () => {
    if (proposedEstimate) {
      setEstimate(proposedEstimate);
      setProposedEstimate(null);
    }
  };

  const discardRefinement = () => setProposedEstimate(null);

  const handleSave = () => {
    if (!estimate) return;
    const clientName = selectedBrandId === 'new' ? prompt("Enter client name:") : brands.find(b => b.id === selectedBrandId)?.name;
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      clientName: clientName || 'Unnamed Client',
      brandId: selectedBrandId !== 'new' ? selectedBrandId : undefined,
      region,
      finalEstimate: estimate,
      status: 'Draft'
    };
    onSaveHistory(newItem);
    alert("Saved!");
  };

  const displayData = proposedEstimate || estimate;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Pricing Estimator</h2>
          <p className="text-slate-500 mt-1">AI-powered mapping using global standards or brand memory.</p>
        </div>
        {!estimate && (
          <div className="flex gap-4">
            <select 
              value={selectedBrandId} 
              onChange={e => setSelectedBrandId(e.target.value)}
              className="p-2 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none"
            >
              <option value="new">New Generic Client</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <div className="flex bg-slate-200 p-1 rounded-xl">
              {(['India', 'International'] as const).map(r => (
                <button 
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${region === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}
                >
                  {r === 'India' ? 'India' : 'Intl'}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {!estimate && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe tasks for this brand..."
              className="w-full h-48 p-5 rounded-2xl border-2 border-slate-50 focus:border-indigo-500 focus:bg-white resize-none transition-all outline-none"
            />
            <div className="flex flex-col">
              <div 
                onClick={() => !imagePreview && fileInputRef.current?.click()}
                className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 transition-all cursor-pointer ${
                  imagePreview ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
                }`}
              >
                {imagePreview ? (
                  <div className="relative h-full w-full">
                    <img src={imagePreview} className="w-full h-full object-contain" />
                    <button onClick={(e) => { e.stopPropagation(); setImagePreview(null); setBase64Image(null); }} className="absolute top-0 right-0 p-2 text-red-500">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                ) : <div className="text-center text-slate-400 font-bold text-sm"><p>Upload Scope/Handwritten List</p></div>}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
          </div>
          <button
            onClick={handleInitialEstimate}
            disabled={loading || (!input.trim() && !base64Image)}
            className="mt-6 w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-100"
          >
            {loading ? 'AI Mapping Tasks...' : 'Calculate Estimate'}
          </button>
        </div>
      )}

      {displayData && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className={`bg-white p-8 rounded-3xl border ${proposedEstimate ? 'border-indigo-400' : 'border-slate-200 shadow-xl'} transition-all`}>
             <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black text-slate-900">
                  Quote for {selectedBrandId === 'new' ? 'New Client' : brands.find(b => b.id === selectedBrandId)?.name}
                </h3>
                <div className="flex gap-2">
                  <button onClick={() => {setEstimate(null); setInput(''); setImagePreview(null);}} className="text-slate-400 hover:text-red-500 px-3 py-1 text-sm font-bold transition-colors">Discard</button>
                  <button onClick={handleSave} className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">Save to History</button>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-slate-900 p-6 rounded-2xl text-white">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total Valuation</p>
                  <p className="text-3xl font-black mt-1">{displayData.currency === 'EUR' ? '€' : '₹'}{displayData.totalEstimate?.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Pricing Strategy</p>
                  <p className="text-lg font-black text-slate-900 mt-1">{selectedBrandId === 'new' ? 'Global Standard' : 'Brand-Specific Memory'}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Recommendation</p>
                  <p className="text-lg font-black text-indigo-600 mt-1">{displayData.recommendedTier}</p>
                </div>
             </div>

             <div className="overflow-x-auto rounded-2xl border border-slate-100 mb-10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                    <tr>
                      <th className="p-5">Deliverable</th>
                      <th className="p-5">Vol</th>
                      <th className="p-5 text-right">Unit Rate</th>
                      <th className="p-5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {displayData.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-5">
                          <p className="font-black text-slate-900">{item.service}</p>
                          <p className="text-xs text-slate-400 mt-1 italic leading-tight">"{item.justification}"</p>
                        </td>
                        <td className="p-5">{item.quantity} {item.unit}</td>
                        <td className="p-5 text-right">{displayData.currency === 'EUR' ? '€' : '₹'}{item.suggestedRate?.toLocaleString()}</td>
                        <td className="p-5 text-right font-black">{displayData.currency === 'EUR' ? '€' : '₹'}{item.total?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>

             <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                <p className="text-[10px] font-black uppercase text-amber-800 tracking-widest mb-3">Pitch Strategy</p>
                <p className="text-amber-950 text-sm leading-relaxed whitespace-pre-line">{displayData.strategicAdvice}</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
