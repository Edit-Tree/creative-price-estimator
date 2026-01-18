
import React, { useState, useMemo, useEffect } from 'react';
import { Brand, BillingModel, WorkLog, ServiceRate, PricingSettings } from '../types';
import { analyzeHistoricalWork } from '../services/gemini';

interface BrandsProps {
  brands: Brand[];
  setBrands: (brands: Brand[]) => void;
  workLogs: WorkLog[];
  setWorkLogs: (logs: WorkLog[]) => void;
  globalRates: ServiceRate[];
  settings: PricingSettings;
}

interface TableRow {
  task: string;
  quantity: string;
  price: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = { 'INR': '₹', 'EUR': '€', 'USD': '$' };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const YEARS = [2024, 2025, 2026];

export const Brands: React.FC<BrandsProps> = ({ brands, setBrands, workLogs, setWorkLogs, globalRates, settings }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newBrand, setNewBrand] = useState<Partial<Brand>>({
    name: '', billingModel: BillingModel.RETAINER, currency: 'INR', region: 'India', learnedRates: [], retainerScopeLimit: ''
  });

  const [loggingFor, setLoggingFor] = useState<Brand | null>(null);
  const [logInput, setLogInput] = useState('');
  
  // Date Range State
  const [startMonth, setStartMonth] = useState(new Date().getMonth());
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth());
  const [endYear, setEndYear] = useState(new Date().getFullYear());

  const [isLogging, setIsLogging] = useState(false);
  const [pendingLogReview, setPendingLogReview] = useState<(Partial<WorkLog> & { totalSheetRevenue?: number }) | null>(null);
  const [viewingDeepDive, setViewingDeepDive] = useState<Brand | null>(null);
  const [inputMode, setInputMode] = useState<'narrative' | 'spreadsheet' | 'table'>('table');

  // Manual Table State
  const [tableRows, setTableRows] = useState<TableRow[]>([
    { task: '', quantity: '', price: '' }
  ]);

  const addTableRow = () => {
    setTableRows([...tableRows, { task: '', quantity: '', price: '' }]);
  };

  const removeTableRow = (index: number) => {
    const newRows = tableRows.filter((_, i) => i !== index);
    setTableRows(newRows.length ? newRows : [{ task: '', quantity: '', price: '' }]);
  };

  const updateTableRow = (index: number, field: keyof TableRow, value: string) => {
    const newRows = [...tableRows];
    newRows[index][field] = value;
    setTableRows(newRows);
  };

  // Smart Paste Handler for the Table
  const handleTablePaste = (e: React.ClipboardEvent, rowIndex: number) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData.includes('\t') && !pasteData.includes('\n')) return; // Just standard text paste

    e.preventDefault();
    const rows = pasteData.split(/\r?\n/).filter(row => row.trim() !== '');
    const newRows: TableRow[] = rows.map(row => {
      const cols = row.split('\t');
      return {
        task: cols[0] || '',
        quantity: cols[1] || '',
        price: cols[2] || ''
      };
    });

    // Replace the table with pasted data starting from current row or whole table
    // For simplicity, we'll replace the table if it's the first empty row, or append
    if (tableRows.length === 1 && !tableRows[0].task) {
      setTableRows(newRows);
    } else {
      const updatedTable = [...tableRows];
      updatedTable.splice(rowIndex, 1, ...newRows);
      setTableRows(updatedTable);
    }
  };

  // Calculate period months based on selected range
  const periodMonths = useMemo(() => {
    const start = startYear * 12 + startMonth;
    const end = endYear * 12 + endMonth;
    return Math.max(1, end - start + 1);
  }, [startMonth, startYear, endMonth, endYear]);

  const handleAddBrand = () => {
    if (!newBrand.name) return;
    const b: Brand = {
      id: crypto.randomUUID(),
      name: newBrand.name!,
      billingModel: newBrand.billingModel!,
      monthlyRetainerFee: newBrand.monthlyRetainerFee,
      retainerScopeLimit: newBrand.retainerScopeLimit,
      currency: newBrand.currency!,
      region: newBrand.region!,
      learnedRates: []
    };
    setBrands([...brands, b]);
    setShowAdd(false);
    setNewBrand({ name: '', billingModel: BillingModel.RETAINER, currency: 'INR', region: 'India', learnedRates: [], retainerScopeLimit: '' });
  };

  const startLogging = async () => {
    if (!loggingFor) return;
    
    let finalInput = logInput;
    if (inputMode === 'table') {
      // Convert table rows to TSV format for the AI Supremacy logic
      finalInput = tableRows
        .filter(r => r.task.trim())
        .map(r => `${r.task}\t${r.quantity}\t${r.price}`)
        .join('\n');
    }

    if (!finalInput.trim()) return;

    setIsLogging(true);
    try {
      const insight = await analyzeHistoricalWork(loggingFor, finalInput, settings, globalRates, periodMonths);
      setPendingLogReview(insight);
    } catch (err) {
      alert("Error analyzing log. Ensure the AI has enough context.");
    } finally {
      setIsLogging(false);
    }
  };

  const confirmLog = () => {
    if (!loggingFor || !pendingLogReview) return;
    
    const actualBilledAmount = pendingLogReview.totalSheetRevenue !== undefined && pendingLogReview.totalSheetRevenue > 0
      ? pendingLogReview.totalSheetRevenue
      : ((loggingFor.monthlyRetainerFee || 0) * periodMonths) + (pendingLogReview.overageTotal || 0);

    const dateRangeLabel = periodMonths > 1 
      ? `${MONTHS[startMonth]} ${startYear} — ${MONTHS[endMonth]} ${endYear}`
      : `${MONTHS[startMonth]} ${startYear}`;

    const newLog: WorkLog = {
      id: crypto.randomUUID(),
      brandId: loggingFor.id,
      month: dateRangeLabel,
      periodMonths: periodMonths,
      rawInput: inputMode === 'table' ? JSON.stringify(tableRows) : logInput,
      deliverables: pendingLogReview.deliverables || [],
      totalMarketValue: pendingLogReview.totalMarketValue || 0,
      overageTotal: pendingLogReview.overageTotal || 0,
      actualBilled: actualBilledAmount,
      health: pendingLogReview.health || 'Healthy',
      aiInsight: pendingLogReview.aiInsight || ''
    };

    setWorkLogs([...workLogs, newLog]);
    
    const updatedBrands = brands.map(b => {
      if (b.id === loggingFor.id) {
        const newLearnedRates = [...b.learnedRates];
        newLog.deliverables.forEach(d => {
          const existing = newLearnedRates.find(lr => lr.name.toLowerCase() === d.service.toLowerCase());
          if (!existing) {
            newLearnedRates.push({
              id: crypto.randomUUID(),
              name: d.service,
              category: d.category || 'Other',
              currentRate: d.suggestedRate,
              currency: b.currency,
              industryRate: (d.suggestedRate || 0) * 1.5,
              unit: d.unit
            });
          }
        });
        return { ...b, learnedRates: newLearnedRates };
      }
      return b;
    });

    setBrands(updatedBrands);
    setPendingLogReview(null);
    setLoggingFor(null);
    setLogInput('');
    setTableRows([{ task: '', quantity: '', price: '' }]);
  };

  const toggleOverage = (index: number) => {
    if (!pendingLogReview?.deliverables) return;
    const items = [...pendingLogReview.deliverables];
    items[index] = { ...items[index], isOverage: !items[index].isOverage };
    const overageTotal = items.reduce((sum, item) => item.isOverage ? sum + (item.total || 0) : sum, 0);
    setPendingLogReview({ ...pendingLogReview, deliverables: items, overageTotal });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Brand Intelligence</h2>
          <p className="text-slate-500 font-medium">Standardize multi-month logs and analyze performance data.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95">
          Add New Brand
        </button>
      </header>

      {showAdd && (
        <div className="bg-white p-8 rounded-3xl border-2 border-indigo-100 shadow-xl animate-in zoom-in duration-300">
          <h3 className="text-xl font-bold mb-6">Setup Brand Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase">Brand Name</label>
              <input placeholder="e.g. Traveleva" className="w-full p-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" value={newBrand.name} onChange={e => setNewBrand({...newBrand, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase">Billing Model</label>
              <select className="w-full p-4 rounded-xl border border-slate-200" value={newBrand.billingModel} onChange={e => setNewBrand({...newBrand, billingModel: e.target.value as BillingModel})}>
                <option value={BillingModel.RETAINER}>Flat Retainer</option>
                <option value={BillingModel.HYBRID}>Hybrid (Retainer + Overages)</option>
                <option value={BillingModel.PROJECT}>Project-Based</option>
              </select>
            </div>
            {newBrand.billingModel !== BillingModel.PROJECT && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Monthly Retainer Fee</label>
                  <input type="number" placeholder="Fee Amount" className="w-full p-4 rounded-xl border border-slate-200" value={newBrand.monthlyRetainerFee} onChange={e => setNewBrand({...newBrand, monthlyRetainerFee: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Retainer Scope (Included Assets)</label>
                  <input placeholder="e.g. 15 Reels, 4 Ads" className="w-full p-4 rounded-xl border border-slate-200" value={newBrand.retainerScopeLimit} onChange={e => setNewBrand({...newBrand, retainerScopeLimit: e.target.value})} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase">Currency</label>
              <select className="w-full p-4 rounded-xl border border-slate-200" value={newBrand.currency} onChange={e => setNewBrand({...newBrand, currency: e.target.value as any})}>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4 mt-8">
            <button onClick={() => setShowAdd(false)} className="px-6 py-3 text-slate-400 font-bold">Cancel</button>
            <button onClick={handleAddBrand} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg">Save Profile</button>
          </div>
        </div>
      )}

      {/* Brand Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brands.map(brand => {
          const brandLogs = workLogs.filter(l => l.brandId === brand.id);
          const lastLog = brandLogs[brandLogs.length - 1];
          return (
            <div key={brand.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
              {lastLog && (
                <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-xl text-[8px] font-black uppercase tracking-widest ${
                  lastLog.health === 'Loss' ? 'bg-red-500 text-white' : 
                  lastLog.health === 'Warning' ? 'bg-amber-400 text-white' : 'bg-emerald-500 text-white'
                }`}>
                  {lastLog.health} DEAL
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-black text-slate-900 mb-1">{brand.name}</h3>
                <div className="flex gap-2">
                  <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">{brand.billingModel}</span>
                  <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{brand.currency}</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="bg-slate-50 p-3 rounded-2xl flex justify-between">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Retainer Scope</p>
                  <p className="text-[10px] font-bold text-slate-700 max-w-[120px] text-right truncate">{brand.retainerScopeLimit || 'Variable'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div className="bg-slate-50 p-3 rounded-2xl">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Retainer</p>
                    <p className="text-xs font-black text-slate-900">{CURRENCY_SYMBOLS[brand.currency]}{(brand.monthlyRetainerFee || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Memory</p>
                    <p className="text-xs font-black text-slate-900">{brand.learnedRates.length} Rates</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button onClick={() => setLoggingFor(brand)} className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold hover:bg-black transition-colors">Log Work History</button>
                <button onClick={() => setViewingDeepDive(brand)} className="w-full border border-slate-200 text-slate-600 py-3 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">Insights & Archive</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Logging Modal with Date Range and Smart Table Input */}
      {loggingFor && !pendingLogReview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex justify-center items-start p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[32px] p-8 shadow-2xl relative my-auto">
            <header className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Log History: {loggingFor.name}</h3>
                <p className="text-slate-500 text-sm mt-1">Select duration. <strong>Tip:</strong> Paste spreadsheet cells directly into the table.</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setInputMode('table')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${inputMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Table Grid</button>
                <button onClick={() => setInputMode('spreadsheet')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${inputMode === 'spreadsheet' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Sheet Paste</button>
                <button onClick={() => setInputMode('narrative')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${inputMode === 'narrative' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Narrative</button>
              </div>
            </header>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">From</label>
                  <div className="flex gap-2">
                    <select value={startMonth} onChange={e => setStartMonth(parseInt(e.target.value))} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-sm">
                      {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select value={startYear} onChange={e => setStartYear(parseInt(e.target.value))} className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-sm">
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">To (End of period)</label>
                  <div className="flex gap-2">
                    <select value={endMonth} onChange={e => setEndMonth(parseInt(e.target.value))} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-sm">
                      {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select value={endYear} onChange={e => setEndYear(parseInt(e.target.value))} className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-sm">
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="bg-indigo-50 p-3 rounded-2xl flex items-center justify-between border border-indigo-100">
                <p className="text-xs font-bold text-indigo-600">Calculated Billing Duration:</p>
                <span className="bg-white px-4 py-1 rounded-full text-xs font-black text-indigo-600 shadow-sm border border-indigo-200">
                  {periodMonths} Month{periodMonths > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="mb-6">
              {inputMode === 'table' ? (
                <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-200 shadow-inner max-h-[450px] overflow-y-auto">
                  <table className="w-full table-fixed">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                        <th className="px-2 py-3 w-[55%]">Task / Deliverable Name</th>
                        <th className="px-2 py-3 w-[15%] text-center">Qty</th>
                        <th className="px-2 py-3 w-[25%] text-right">Actual Billed ({CURRENCY_SYMBOLS[loggingFor.currency]})</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="space-y-2">
                      {tableRows.map((row, idx) => (
                        <tr key={idx} className="group border-b border-slate-100/50 last:border-0">
                          <td className="px-1 py-2">
                            <input 
                              placeholder="Paste or type task..." 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 shadow-sm"
                              value={row.task}
                              onPaste={(e) => handleTablePaste(e, idx)}
                              onChange={e => updateTableRow(idx, 'task', e.target.value)}
                            />
                          </td>
                          <td className="px-1 py-2 text-center">
                            <input 
                              type="number"
                              placeholder="0" 
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black text-center outline-none focus:border-indigo-500 shadow-sm"
                              value={row.quantity}
                              onChange={e => updateTableRow(idx, 'quantity', e.target.value)}
                            />
                          </td>
                          <td className="px-1 py-2 text-right">
                            <input 
                              type="number"
                              placeholder="0" 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-right outline-none focus:border-indigo-500 shadow-sm"
                              value={row.price}
                              onChange={e => updateTableRow(idx, 'price', e.target.value)}
                            />
                          </td>
                          <td className="px-1 py-2 text-center">
                            <button 
                              onClick={() => removeTableRow(idx)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-6 flex gap-3">
                    <button 
                      onClick={addTableRow}
                      className="flex-1 py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-black text-xs hover:border-indigo-400 hover:text-indigo-600 hover:bg-white transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      New Empty Row
                    </button>
                    {tableRows.length > 1 && (
                      <button 
                        onClick={() => setTableRows([{ task: '', quantity: '', price: '' }])}
                        className="px-6 py-4 bg-slate-200 text-slate-600 rounded-2xl font-black text-xs hover:bg-red-50 hover:text-red-600 transition-all"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <textarea 
                  className="w-full h-64 p-6 rounded-3xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all font-mono text-sm shadow-inner"
                  placeholder={inputMode === 'spreadsheet' ? "Pasting here will attempt to auto-parse TSV/CSV format...\n\nTask A\t10\t500\nTask B\t5\t200" : "Describe the deliverables for this period in plain text..."}
                  value={logInput}
                  onChange={e => setLogInput(e.target.value)}
                />
              )}
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-slate-50">
              <button onClick={() => setLoggingFor(null)} className="px-8 py-4 font-bold text-slate-400">Cancel</button>
              <button onClick={startLogging} disabled={isLogging || (inputMode === 'table' && tableRows.every(r => !r.task.trim()))} className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 disabled:opacity-50 hover:bg-indigo-700 transition-all">
                {isLogging ? 'AI Auditing Data Supremacy...' : 'Analyze Work Log'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Confirmation View */}
      {pendingLogReview && loggingFor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex justify-center items-start p-4 overflow-y-auto animate-in zoom-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[40px] p-6 md:p-10 shadow-2xl my-8 relative flex flex-col">
            <header className="flex items-center justify-between mb-8 pb-8 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-3xl font-black text-slate-900">Log Verification</h3>
                <p className="text-slate-500 font-medium">Period: <span className="text-indigo-600">{MONTHS[startMonth]} {startYear} {periodMonths > 1 ? `— ${MONTHS[endMonth]} ${endYear}` : ''} ({periodMonths} mo)</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase">Margin Verdict</p>
                <span className={`px-4 py-1 rounded-full text-xs font-black uppercase ${
                  pendingLogReview.health === 'Loss' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                }`}>{pendingLogReview.health} Margin</span>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 shrink-0">
              <div className="bg-slate-50 p-6 rounded-3xl">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Fee Collected</p>
                <p className="text-2xl font-black text-slate-900">
                  {CURRENCY_SYMBOLS[loggingFor.currency]}
                  {((pendingLogReview.totalSheetRevenue !== undefined && pendingLogReview.totalSheetRevenue > 0) 
                    ? pendingLogReview.totalSheetRevenue 
                    : ((loggingFor.monthlyRetainerFee || 0) * periodMonths)).toLocaleString()}
                </p>
              </div>
              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-1">Overage Value</p>
                <p className="text-2xl font-black text-amber-600">{CURRENCY_SYMBOLS[loggingFor.currency]}{(pendingLogReview.overageTotal || 0).toLocaleString()}</p>
              </div>
              <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl">
                <p className="text-[10px] opacity-70 font-black uppercase tracking-widest mb-1">Total Market Value</p>
                <p className="text-2xl font-black">
                  {CURRENCY_SYMBOLS[loggingFor.currency]}{(pendingLogReview.totalMarketValue || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-4 mb-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deliverables Detected & Standardized</p>
              <div className="grid grid-cols-1 gap-3">
                {pendingLogReview.deliverables?.map((d, i) => (
                  <div 
                    key={i} 
                    onClick={() => toggleOverage(i)}
                    className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      d.isOverage ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-slate-100 hover:border-indigo-100'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${d.isOverage ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <div>
                        <p className="font-black text-slate-900 text-sm">{d.service}</p>
                        <p className="text-[10px] font-black text-indigo-400 uppercase">{d.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                       <div className="text-right">
                        <p className="font-black text-slate-900 text-sm">{CURRENCY_SYMBOLS[loggingFor.currency]}{(d.suggestedRate || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 font-bold">x {d.quantity} {d.unit}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${d.isOverage ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {d.isOverage ? 'Extra' : 'Retainer'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[32px] text-white mb-10 shrink-0">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">AI Strategic Enrichment</p>
              <p className="text-sm font-medium leading-relaxed italic">"{pendingLogReview.aiInsight}"</p>
            </div>

            <div className="flex justify-end gap-4 shrink-0 pt-6 border-t border-slate-100">
              <button onClick={() => setPendingLogReview(null)} className="px-8 py-4 font-bold text-slate-400">Discard</button>
              <button onClick={confirmLog} className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black shadow-lg">
                Approve & Save Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brand Deep-Dive Modal */}
      {viewingDeepDive && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex justify-center items-start p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl rounded-[40px] p-8 md:p-12 shadow-2xl my-auto relative flex flex-col min-h-[80vh]">
            <header className="flex justify-between items-start mb-10 pb-8 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-4xl font-black text-slate-900">{viewingDeepDive.name} Knowledge Archive</h3>
                <p className="text-slate-500 text-lg font-medium mt-1">Aggregated performance insights and historical rate cards.</p>
              </div>
              <button onClick={() => setViewingDeepDive(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 flex-1">
              <div className="lg:col-span-1 space-y-8 border-r border-slate-100 pr-8">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Learned Rate Card</h4>
                  <div className="space-y-3">
                    {viewingDeepDive.learnedRates.map(r => (
                      <div key={r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-start">
                          <p className="font-black text-slate-900 text-xs">{r.name}</p>
                          <p className="text-[10px] font-black text-indigo-500">{CURRENCY_SYMBOLS[r.currency]}{r.currentRate}</p>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{r.unit}</p>
                      </div>
                    ))}
                    {viewingDeepDive.learnedRates.length === 0 && <p className="text-xs text-slate-400 italic">No rates learned yet.</p>}
                  </div>
                </div>

                <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl">
                  <h4 className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-4">Archive Stats</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold">Total Logs</p>
                      <p className="text-xl font-black">{workLogs.filter(l => l.brandId === viewingDeepDive.id).length}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-12 h-full overflow-y-auto pr-2 scrollbar-hide">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Historical Performance Insight</h4>
                  <div className="space-y-6">
                    {workLogs.filter(l => l.brandId === viewingDeepDive.id).reverse().map(log => (
                      <div key={log.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all">
                        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                          <h5 className="text-white font-black text-sm uppercase tracking-widest">{log.month}</h5>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                            log.health === 'Loss' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                          }`}>{log.health} Period</span>
                        </div>
                        
                        <div className="p-6">
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-50 p-4 rounded-2xl">
                              <p className="text-[9px] text-slate-400 font-black uppercase">Revenue Collected</p>
                              <p className="text-lg font-black text-slate-900">{CURRENCY_SYMBOLS[viewingDeepDive.currency]}{log.actualBilled.toLocaleString()}</p>
                            </div>
                            <div className="bg-indigo-50 p-4 rounded-2xl">
                              <p className="text-[9px] text-indigo-400 font-black uppercase">Market Value</p>
                              <p className="text-lg font-black text-indigo-600">{CURRENCY_SYMBOLS[viewingDeepDive.currency]}{log.totalMarketValue.toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Crucial AI Insight</p>
                            <div className="p-4 bg-slate-50 rounded-2xl border-l-4 border-indigo-500 italic text-sm text-slate-600 leading-relaxed">
                              "{log.aiInsight}"
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => setViewingDeepDive(null)} className="mt-12 w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg hover:bg-black transition-all shadow-xl shadow-slate-200 shrink-0">
              Close Deep-Dive
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
