
import { GoogleGenAI, Type } from "@google/genai";
import { PricingSettings, ServiceRate, EstimateResponse, HistoryItem, InvoiceInsight, Brand, WorkLog, BillingModel } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY}); strictly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ESTIMATE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          service: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          suggestedRate: { type: Type.NUMBER },
          total: { type: Type.NUMBER },
          justification: { type: Type.STRING },
          category: { type: Type.STRING },
          isOverage: { type: Type.BOOLEAN }
        },
        required: ["service", "quantity", "unit", "suggestedRate", "total", "justification"]
      }
    },
    totalEstimate: { type: Type.NUMBER },
    currency: { type: Type.STRING },
    recommendedTier: { type: Type.STRING },
    strategicAdvice: { type: Type.STRING },
    thoughtProcess: { type: Type.STRING },
    mappingLogic: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          inputPoint: { type: Type.STRING },
          mappedService: { type: Type.STRING },
          reasoning: { type: Type.STRING }
        }
      }
    }
  },
  required: ["items", "totalEstimate", "currency", "strategicAdvice", "thoughtProcess", "mappingLogic"]
};

export async function analyzeHistoricalWork(
  brand: Brand,
  input: string,
  settings: PricingSettings,
  globalRates: ServiceRate[],
  periodMonths: number = 1
): Promise<Partial<WorkLog> & { totalSheetRevenue: number }> {
  const model = 'gemini-3-pro-preview';
  const systemInstruction = `
    You are an Agency Audit Expert. The user is pasting a Spreadsheet/Table of work done for brand: ${brand.name}.
    
    IMPORTANT CONTEXT:
    - This data covers a period of ${periodMonths} MONTH(S). 
    - Adjust your volume expectations accordingly. (e.g. if the retainer includes 10 reels/mo, then 50 reels over 5 months is WITHIN retainer).
    
    DATA SUPREMACY RULE:
    - Do NOT reinvent the wheel. Treat the numbers in the input as the absolute TRUTH for what was billed.
    - If the input is a table (Tab/Space separated), map every single row 1-to-1.
    - Extract: Task Name, Quantity (Units), and the ACTUAL Price charged in the sheet.
    
    AGENCY STANDARDS (For comparison only):
    - SYSTEM RATES: ${JSON.stringify([...brand.learnedRates, ...globalRates])}
    
    LOGIC:
    1. Parse the table. Extract "service" (Task Name), "quantity", "unit", and "actualPriceCharged".
    2. "suggestedRate": Look up the closest match in SYSTEM RATES. If your standard is 20 but they charged 13, set suggestedRate to 20.
    3. "total": This should be the price from the USER'S SHEET (quantity * actualPriceCharged).
    4. "totalSheetRevenue": Sum of all prices in the PRICE column of the user's input.
    5. "totalMarketValue": Sum of (quantity * suggestedRate from SYSTEM RATES).
    6. "health": 
       - 'Loss' if totalSheetRevenue < totalMarketValue.
       - 'Healthy' if totalSheetRevenue >= totalMarketValue.
    7. "aiInsight": Specifically mention where they are losing money based on the sheet vs standards. Mention the ${periodMonths}-month span.
    
    Return a valid JSON object.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: `User Spreadsheet Data: \n${input}` }] }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          deliverables: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                service: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                suggestedRate: { type: Type.NUMBER },
                total: { type: Type.NUMBER },
                category: { type: Type.STRING },
                isOverage: { type: Type.BOOLEAN }
              }
            }
          },
          totalMarketValue: { type: Type.NUMBER },
          totalSheetRevenue: { type: Type.NUMBER },
          overageTotal: { type: Type.NUMBER },
          health: { type: Type.STRING, enum: ["Healthy", "Loss", "Warning"] },
          aiInsight: { type: Type.STRING }
        },
        required: ["deliverables", "totalMarketValue", "totalSheetRevenue", "overageTotal", "health", "aiInsight"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function estimatePricing(
  snippet: string,
  settings: PricingSettings,
  currentRates: ServiceRate[],
  region: 'India' | 'International' = 'India',
  history: HistoryItem[] = [],
  image?: { data: string; mimeType: string },
  brand?: Brand
): Promise<EstimateResponse> {
  const model = 'gemini-3-flash-preview';
  
  const effectiveRates = brand ? [...brand.learnedRates, ...currentRates.filter(r => !brand.learnedRates.find(bl => bl.name === r.name))] : currentRates;

  const systemInstruction = `
    Agency Consultant AI. Region: ${region}. 
    BRAND CONTEXT: ${brand ? `Estimating for ${brand.name}. Model: ${brand.billingModel}.` : 'Generic New Client.'}
    RATES: ${JSON.stringify(effectiveRates)}
    PHILOSOPHY: ${settings.philosophy}
  `;

  const parts: any[] = [{ text: `Scope: ${snippet}` }];
  if (image) parts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: ESTIMATE_SCHEMA
    }
  });

  const result = JSON.parse(response.text || '{}') as EstimateResponse;
  result.rawInput = snippet;
  return result;
}

export async function analyzeInvoice(
  input: string,
  file?: { data: string; mimeType: string }
): Promise<InvoiceInsight[]> {
  const model = 'gemini-3-flash-preview';
  const systemInstruction = `Extract standard rates from invoices. Generalize names (e.g. ignore dates/weeks). Detect currency.`;

  const parts: any[] = [{ text: `Invoice: ${input}` }];
  if (file) parts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts }],
    config: { systemInstruction, responseMimeType: "application/json", responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          detectedName: { type: Type.STRING },
          detectedCategory: { type: Type.STRING, enum: ["Design", "Video", "Motion", "Strategy", "Other"] },
          detectedRate: { type: Type.NUMBER },
          detectedCurrency: { type: Type.STRING, enum: ["INR", "EUR", "USD"] },
          detectedUnit: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          sourceLabel: { type: Type.STRING }
        }
      }
    } }
  });

  return JSON.parse(response.text || '[]').map((item: any) => ({ ...item, id: crypto.randomUUID() }));
}
