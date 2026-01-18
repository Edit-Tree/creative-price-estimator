
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Estimator } from './components/Estimator';
import { ClientAudit } from './components/ClientAudit';
import { KnowledgeBase } from './components/KnowledgeBase';
import { History } from './components/History';
import { Brands } from './components/Brands';
import { INITIAL_CLIENTS, DEFAULT_SERVICE_RATES, DEFAULT_SETTINGS } from './constants';
import { ServiceRate, PricingSettings, ClientData, HistoryItem, InvoiceInsight, Brand, WorkLog, BillingModel } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'estimator' | 'knowledge' | 'audit' | 'history' | 'brands'>('estimator');
  
  const [rates, setRates] = useState<ServiceRate[]>(() => {
    const saved = localStorage.getItem('agency_rates');
    return saved ? JSON.parse(saved) : DEFAULT_SERVICE_RATES;
  });

  const [settings, setSettings] = useState<PricingSettings>(() => {
    const saved = localStorage.getItem('agency_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('agency_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [invoiceInsights, setInvoiceInsights] = useState<InvoiceInsight[]>(() => {
    const saved = localStorage.getItem('agency_invoice_insights');
    return saved ? JSON.parse(saved) : [];
  });

  const [brands, setBrands] = useState<Brand[]>(() => {
    const saved = localStorage.getItem('agency_brands');
    if (saved) return JSON.parse(saved);
    return [
      { 
        id: 'b1', 
        name: 'CashBook', 
        billingModel: BillingModel.RETAINER, 
        monthlyRetainerFee: 100000, 
        currency: 'INR', 
        region: 'India', 
        learnedRates: [],
        retainerScopeLimit: 'Strategy, Visuals, Motion, Video Editing'
      },
      { 
        id: 'b2', 
        name: 'Shumee', 
        billingModel: BillingModel.RETAINER, 
        monthlyRetainerFee: 40000, 
        currency: 'INR', 
        region: 'India', 
        learnedRates: [],
        retainerScopeLimit: '12 Reels, Social Strategy, Calendar'
      },
      { 
        id: 'b3', 
        name: 'Traveleva', 
        billingModel: BillingModel.HYBRID, 
        monthlyRetainerFee: 15000, 
        currency: 'INR', 
        region: 'India', 
        learnedRates: [],
        retainerScopeLimit: '10-15 Reels, a few Ads'
      },
      { 
        id: 'b4', 
        name: 'Cook and Pan', 
        billingModel: BillingModel.PROJECT, 
        currency: 'EUR', 
        region: 'International', 
        learnedRates: [] 
      },
      { 
        id: 'b5', 
        name: 'Shinrai Knives', 
        billingModel: BillingModel.HYBRID, 
        monthlyRetainerFee: 55000, 
        currency: 'INR', 
        region: 'International', 
        learnedRates: [],
        retainerScopeLimit: 'Full Social Media Management'
      },
    ];
  });

  const [workLogs, setWorkLogs] = useState<WorkLog[]>(() => {
    const saved = localStorage.getItem('agency_worklogs');
    return saved ? JSON.parse(saved) : [];
  });

  const [clients] = useState<ClientData[]>(INITIAL_CLIENTS);

  useEffect(() => localStorage.setItem('agency_rates', JSON.stringify(rates)), [rates]);
  useEffect(() => localStorage.setItem('agency_settings', JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem('agency_history', JSON.stringify(history)), [history]);
  useEffect(() => localStorage.setItem('agency_invoice_insights', JSON.stringify(invoiceInsights)), [invoiceInsights]);
  useEffect(() => localStorage.setItem('agency_brands', JSON.stringify(brands)), [brands]);
  useEffect(() => localStorage.setItem('agency_worklogs', JSON.stringify(workLogs)), [workLogs]);

  const handleUpdateBrand = (updatedBrand: Brand) => {
    setBrands(brands.map(b => b.id === updatedBrand.id ? updatedBrand : b));
  };

  const handleSaveToHistory = (item: HistoryItem) => {
    setHistory(prev => [...prev, item]);
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'estimator' && (
        <Estimator 
          settings={settings} 
          rates={rates} 
          history={history} 
          onSaveHistory={handleSaveToHistory} 
          brands={brands}
        />
      )}
      {activeTab === 'history' && (
        <History history={history} onDelete={handleDeleteHistory} />
      )}
      {activeTab === 'audit' && (
        <ClientAudit 
          brands={brands} 
          workLogs={workLogs} 
          setWorkLogs={setWorkLogs}
          rates={rates} 
          onUpdateBrand={handleUpdateBrand}
        />
      )}
      {activeTab === 'brands' && (
        <Brands 
          brands={brands} 
          setBrands={setBrands} 
          workLogs={workLogs} 
          setWorkLogs={setWorkLogs}
          globalRates={rates}
          settings={settings}
        />
      )}
      {activeTab === 'knowledge' && (
        <KnowledgeBase 
          rates={rates} 
          setRates={setRates} 
          settings={settings} 
          setSettings={setSettings} 
          history={history}
          invoiceInsights={invoiceInsights}
          setInvoiceInsights={setInvoiceInsights}
        />
      )}
    </Layout>
  );
};

export default App;
