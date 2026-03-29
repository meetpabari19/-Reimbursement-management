import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAuthUser(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Fallback regex-based parser for when AI structuring is unavailable.
 */
function parseReceiptTextRegex(text: string) {
  // Try to find amounts with currency symbols
  const amountMatch = text.match(/(?:total|amount|grand\s*total|subtotal)[:\s]*[\$€£₹]?\s*(\d+[.,]\d{2})/i)
    || text.match(/[\$€£₹]\s?(\d+[.,]\d{2})/)
    || text.match(/(\d+[.,]\d{2})/);

  // Try multiple date formats
  const dateMatch = text.match(/(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/)
    || text.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/)
    || text.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2})/);

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Detect currency from symbols
  let currency = 'USD';
  if (text.includes('₹') || text.toLowerCase().includes('inr')) currency = 'INR';
  else if (text.includes('€') || text.toLowerCase().includes('eur')) currency = 'EUR';
  else if (text.includes('£') || text.toLowerCase().includes('gbp')) currency = 'GBP';

  // Category detection with broader keywords
  let category = 'Supplies';
  const lowerText = text.toLowerCase();
  if (lowerText.match(/restaurant|cafe|food|lunch|dinner|breakfast|coffee|tea|meal|eat|dine|bistro|kitchen/)) category = 'Meals';
  else if (lowerText.match(/hotel|inn|stay|resort|airbnb|lodge|motel|hostel|booking\.com/)) category = 'Accommodation';
  else if (lowerText.match(/uber|taxi|flight|airline|airways|cab|ola|rapido|train|railway|metro|bus|lyft|grab/)) category = 'Transport';
  else if (lowerText.match(/travel|trip|tour|visa|passport/)) category = 'Travel';

  // Format date to YYYY-MM-DD
  let formattedDate = '';
  if (dateMatch) {
    const raw = dateMatch[1];
    // Check if already YYYY-MM-DD
    if (/^\d{4}[-\/]/.test(raw)) {
      formattedDate = raw.replace(/\//g, '-');
    } else {
      // Assume DD/MM/YYYY or MM/DD/YYYY
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
    date: formattedDate,
    merchant: lines.length > 0 ? lines[0].substring(0, 80) : '',
    category,
    currency,
    description: lines.length > 1 ? lines.slice(0, 3).join(' | ') : lines[0] || 'Scanned receipt',
  };
}

/**
 * Use Gemini AI to structure raw OCR text into expense fields.
 */
async function structureWithGemini(rawText: string, geminiApiKey: string) {
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

    // Clean up potential markdown code fences
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      amount: parsed.amount || '',
      currency: parsed.currency || 'USD',
      category: parsed.category || 'Supplies',
      description: parsed.description || 'Receipt expense',
      date: parsed.date || '',
      merchant: parsed.merchant || '',
    };
  } catch (err) {
    console.error('Gemini structuring failed:', err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    // Auth header is completely optional now
    const authHeader = req.headers.get('Authorization') || '';
    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // We try to get user id, if not it goes to 'anonymous'
    let userId = 'anonymous';
    try {
        if (authHeader) {
           const { data: { user } } = await supabaseAuthClient.auth.getUser();
           if (user) userId = user.id;
        }
    } catch {
       // just ignore
    }

    // Always use service role or anon key to allow uploading files
    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';

      let rawText = '';
      let receipt_url = '';

      // Handle two modes:
      // 1. FormData with file → run Vision OCR + AI structuring
      // 2. JSON with { rawText } → skip OCR, just do AI structuring
      if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        if (!file) throw new Error('No file uploaded');

        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);

        // Upload to storage using `userId` (which can be 'anonymous')
        const timestamp = Date.now();
        const filePath = `${userId}/${timestamp}-${file.name}`;

        const { error: storageError } = await supabase.storage
          .from('receipts')
          .upload(filePath, arrayBuffer, { contentType: file.type });

        if (storageError) {
          console.error('Storage upload error:', storageError.message);
          // Continue without receipt URL — don't block OCR
        } else {
          receipt_url = supabase.storage.from('receipts').getPublicUrl(filePath).data.publicUrl;
        }

        // Stage 1: Extract text via Google Vision API
        const visionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
        if (visionApiKey) {
          const visionRes = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requests: [{
                  image: { content: base64 },
                  features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
                }]
              })
            }
          );
          const visionJson = await visionRes.json();
          rawText = visionJson.responses?.[0]?.fullTextAnnotation?.text || '';
        }
      } else {
        // JSON mode: client already extracted text (e.g. via Tesseract.js)
        const body = await req.json();
        rawText = body.rawText || '';
      }

      // Stage 2: Structure with Gemini AI
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
      let structured = null;

      if (rawText && geminiApiKey) {
        structured = await structureWithGemini(rawText, geminiApiKey);
      }

      // Fallback: regex parsing
      if (!structured && rawText) {
        const regexParsed = parseReceiptTextRegex(rawText);
        structured = {
          amount: regexParsed.amount,
          currency: regexParsed.currency,
          category: regexParsed.category,
          description: regexParsed.description,
          date: regexParsed.date,
          merchant: regexParsed.merchant,
        };
      }

      // Final fallback: demo values
      if (!structured) {
        structured = {
          amount: '',
          currency: 'USD',
          category: '',
          description: '',
          date: new Date().toISOString().slice(0, 10),
          merchant: '',
        };
      }

      return new Response(JSON.stringify({
        amount: structured.amount,
        currency: structured.currency,
        category: structured.category,
        description: structured.merchant
          ? `${structured.merchant} — ${structured.description}`
          : structured.description || 'Scanned receipt',
        date: structured.date || new Date().toISOString().slice(0, 10),
        merchant: structured.merchant,
        receipt_url,
        ocr_raw: rawText,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: true, message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
