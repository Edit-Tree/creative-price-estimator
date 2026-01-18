
export enum PricingTier {
  MAINTENANCE = 'Maintenance',
  GROWTH = 'Growth',
  PARTNER = 'Partner'
}

export enum BillingModel {
  RETAINER = 'Retainer',
  PROJECT = 'Project-Based',
  HYBRID = 'Hybrid'
}

export interface ServiceRate {
  id: string;
  name: string;
  category: 'Design' | 'Video' | 'Motion' | 'Strategy' | 'Other';
  currentRate: number;
  currency: 'INR' | 'EUR' | 'USD';
  industryRate: number;
  unit: string;
  notes?: string;
}

export interface ClientData {
  id: string;
  name: string;
  currentPay: number;
  scope: string;
  region: 'India' | 'International';
}

export interface Brand {
  id: string;
  name: string;
  billingModel: BillingModel;
  monthlyRetainerFee?: number;
  retainerScopeLimit?: string;
  currency: 'INR' | 'EUR' | 'USD';
  region: 'India' | 'International';
  learnedRates: ServiceRate[];
}

export interface WorkLog {
  id: string;
  brandId: string;
  month: string; 
  periodMonths: number; // Support for 2-3 months billing together
  rawInput: string;
  deliverables: EstimateItem[];
  totalMarketValue: number;
  actualBilled: number; 
  overageTotal: number;
  health: 'Healthy' | 'Loss' | 'Warning';
  aiInsight: string;
}

export interface PricingSettings {
  agencyMultiplier: number;
  internationalMultiplier: number;
  juniorHourlyCost: number;
  seniorHourlyCost: number;
  philosophy: string;
  tiers: {
    name: PricingTier;
    priceRange: string;
    deliverables: string[];
  }[];
}

export interface EstimateItem {
  service: string;
  quantity: number;
  unit: string;
  suggestedRate: number;
  total: number;
  justification: string;
  category?: ServiceRate['category'];
  isOverage?: boolean;
}

export interface TaskMapping {
  inputPoint: string;
  mappedService: string;
  reasoning: string;
}

export interface EstimateResponse {
  items: EstimateItem[];
  totalEstimate: number;
  currency: string;
  recommendedTier?: PricingTier;
  strategicAdvice: string;
  thoughtProcess?: string;
  mappingLogic?: TaskMapping[];
  rawInput?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  clientName?: string;
  brandId?: string;
  region: 'India' | 'International';
  finalEstimate: EstimateResponse;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected';
  notes?: string;
}

export interface InvoiceInsight {
  id: string;
  detectedName: string;
  detectedCategory: ServiceRate['category'];
  detectedRate: number;
  detectedCurrency: 'INR' | 'EUR' | 'USD';
  detectedUnit: string;
  confidence: number;
  sourceLabel: string;
}
