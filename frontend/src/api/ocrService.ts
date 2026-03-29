/// <reference types="vite/client" />
import Tesseract from 'tesseract.js';

export interface OcrResult {
  amount: string;
  currency: string;
  category: string;
  description: string;
  date: string;
  merchant: string;
  rawText: string;
  receipt_url?: string;
}

/**
 * Extract text from an image file using Tesseract.js (runs in browser).
 */
export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const result = await Tesseract.recognize(file, 'eng', {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });
  return result.data.text;
}

/**
 * Use Gemini AI to structure raw OCR text into expense fields.
 * Requires VITE_GEMINI_API_KEY to be set.
 */
export async function structureTextWithGemini(rawText: string): Promise<OcrResult | null> {
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!geminiApiKey) return null;

  try {
    const prompt = `You are an expense receipt parser. Extract structured data from this receipt text.

Receipt text:
"""
${rawText}
"""

Return ONLY valid JSON (no markdown, no code fences) with these fields:
{
  "amount": "numeric string e.g. 125.50",
  "currency": "3-letter code e.g. USD, INR, EUR, GBP",
  "category": "one of: Travel, Meals, Supplies, Transport, Accommodation",
  "description": "brief description of what was purchased",
  "date": "YYYY-MM-DD format",
  "merchant": "name of the merchant/vendor"
}

If a field cannot be determined, use an empty string. For amount, extract the total/grand total.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          }
        })
      }
    );

    const json = await response.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      amount: parsed.amount || '',
      currency: parsed.currency || 'USD',
      category: parsed.category || '',
      description: parsed.description || 'Receipt expense',
      date: parsed.date || '',
      merchant: parsed.merchant || '',
      rawText,
    };
  } catch (err) {
    console.error('Gemini structuring failed:', err);
    return null;
  }
}

/**
 * Fallback regex-based parser for when AI structuring is unavailable.
 */
export function parseReceiptTextFallback(rawText: string): OcrResult {
  const amountMatch = rawText.match(/(?:total|amount|grand\s*total|subtotal)[:\s]*[\$€£₹]?\s*(\d+[.,]\d{2})/i)
    || rawText.match(/[\$€£₹]\s?(\d+[.,]\d{2})/)
    || rawText.match(/(\d+[.,]\d{2})/);

  const dateMatch = rawText.match(/(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/)
    || rawText.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/)
    || rawText.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2})/);

  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let currency = 'USD';
  if (rawText.includes('₹') || rawText.toLowerCase().includes('inr')) currency = 'INR';
  else if (rawText.includes('€') || rawText.toLowerCase().includes('eur')) currency = 'EUR';
  else if (rawText.includes('£') || rawText.toLowerCase().includes('gbp')) currency = 'GBP';

  let category = '';
  const lowerText = rawText.toLowerCase();
  if (lowerText.match(/restaurant|cafe|food|lunch|dinner|breakfast|coffee|tea|meal|eat/)) category = 'Meals';
  else if (lowerText.match(/hotel|inn|stay|resort|airbnb|lodge|motel/)) category = 'Accommodation';
  else if (lowerText.match(/uber|taxi|flight|airline|cab|ola|train|metro|bus/)) category = 'Transport';
  else if (lowerText.match(/travel|trip|tour|visa|passport/)) category = 'Travel';
  else category = 'Supplies';

  let formattedDate = '';
  if (dateMatch) {
    const raw = dateMatch[1];
    if (/^\d{4}[-\/]/.test(raw)) {
      formattedDate = raw.replace(/\//g, '-');
    } else {
      const parts = raw.split(/[-\/]/);
      if (parts[2]?.length === 4) {
        formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts[2]?.length === 2) {
        formattedDate = `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }

  return {
    amount: amountMatch ? amountMatch[1].replace(',', '.') : '',
    currency,
    category,
    description: lines.length > 1 ? lines.slice(0, 2).join(' — ') : lines[0] || 'Scanned receipt',
    date: formattedDate,
    merchant: lines.length > 0 ? lines[0].substring(0, 60) : '',
    rawText,
  };
}

/**
 * Full OCR pipeline:
 * 1. Extract text from image using Tesseract.js
 * 2. Try AI structuring via Gemini
 * 3. Fallback to regex parsing
 */
export async function processReceiptImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OcrResult> {
  // Step 1: Extract text
  const rawText = await extractTextFromImage(file, onProgress);

  if (!rawText.trim()) {
    return {
      amount: '',
      currency: 'USD',
      category: '',
      description: 'Could not extract text from the image',
      date: new Date().toISOString().slice(0, 10),
      merchant: '',
      rawText: '',
    };
  }

  // Step 2: Try Gemini AI structuring
  const aiResult = await structureTextWithGemini(rawText);
  if (aiResult) return aiResult;

  // Step 3: Fallback to regex parsing
  return parseReceiptTextFallback(rawText);
}
