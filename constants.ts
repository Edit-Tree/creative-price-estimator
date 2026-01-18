
import { PricingTier, ServiceRate, PricingSettings, ClientData } from './types';

export const DEFAULT_SERVICE_RATES: ServiceRate[] = [
  { id: '1', name: 'Reel Editing', category: 'Video', currentRate: 1000, currency: 'INR', industryRate: 4000, unit: 'per reel' },
  { id: '2', name: 'Motion Graphics', category: 'Motion', currentRate: 200, currency: 'INR', industryRate: 750, unit: 'per sec' },
  { id: '3', name: 'Video Shoot (Day)', category: 'Video', currentRate: 10000, currency: 'INR', industryRate: 35000, unit: 'per day' },
  { id: '4', name: 'Static Graphic', category: 'Design', currentRate: 500, currency: 'INR', industryRate: 3500, unit: 'per design' },
  { id: '5', name: 'Packaging Design (Domestic)', category: 'Design', currentRate: 27000, currency: 'INR', industryRate: 65000, unit: 'per project' },
  { id: '6', name: 'Strategy/Consulting', category: 'Strategy', currentRate: 5000, currency: 'INR', industryRate: 15000, unit: 'per hour' },
  { id: '7', name: 'Ad Creative (Video)', category: 'Video', currentRate: 2000, currency: 'INR', industryRate: 6000, unit: 'per ad' },
  { id: '8', name: 'Packaging Design (EU)', category: 'Design', currentRate: 300, currency: 'EUR', industryRate: 800, unit: 'per design' },
  { id: '9', name: 'Ad Design (EU)', category: 'Design', currentRate: 20, currency: 'EUR', industryRate: 60, unit: 'per ad' },
];

export const INITIAL_CLIENTS: ClientData[] = [
  { id: 'c1', name: 'CashBook', currentPay: 100000, scope: 'Strategy, Visuals, Motion, Video Help', region: 'India' },
  { id: 'c2', name: 'Shumee', currentPay: 40000, scope: 'Instagram Growth, 12 Reels, UGC, Calendar', region: 'India' },
  { id: 'c3', name: 'Traveleva', currentPay: 15000, scope: '15 Reels a month, few ads', region: 'India' },
  { id: 'c4', name: 'Best/Vikash Steel', currentPay: 10000, scope: 'Festival/Event posts', region: 'India' },
  { id: 'c5', name: 'Cook and Pan (EU)', currentPay: 27000, scope: 'Packaging Design (€300)', region: 'International' },
  { id: 'c6', name: 'Mason George', currentPay: 45000, scope: 'Video Editing & Motion', region: 'International' },
  { id: 'c7', name: 'Shinrai Knives', currentPay: 55000, scope: 'Social Media Management', region: 'International' },
];

export const DEFAULT_SETTINGS: PricingSettings = {
  agencyMultiplier: 2.5,
  internationalMultiplier: 3.5,
  juniorHourlyCost: 400,
  seniorHourlyCost: 1000,
  philosophy: "Strategy-First Creative: We don't just move pixels; we move metrics. Our work separates into Execution (Production) and Thinking Thoughts (Strategy). For European clients, we maintain premium standards matching €60-€100/hr market expectations.",
  tiers: [
    {
      name: PricingTier.MAINTENANCE,
      priceRange: "₹25k - ₹35k",
      deliverables: ["8-10 Static Graphics", "Basic Copywriting", "No Strategy/Shoots"]
    },
    {
      name: PricingTier.GROWTH,
      priceRange: "₹60k - ₹80k",
      deliverables: ["Social Strategy", "12 High-Quality Reels", "4 Statics", "Monthly Reports"]
    },
    {
      name: PricingTier.PARTNER,
      priceRange: "₹1.2L - ₹2L",
      deliverables: ["CMO Level Strategy", "Full Content Suite", "Motion Ads", "Weekly Optimization"]
    }
  ]
};
