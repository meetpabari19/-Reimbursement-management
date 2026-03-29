import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache for countries to avoid repeated fetches per container invocation
let cachedCountries: any = null;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    if (req.method === 'GET' && url.pathname.endsWith('/rates')) {
      // Check cache first
      const { data: cached } = await supabase
        .from('currency_rates')
        .select('*')
        .eq('base_currency', 'USD')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      if (cached && cached.fetched_at > oneHourAgo) {
        return new Response(JSON.stringify(cached.rates), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Fetch fresh rates
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const json = await res.json();

      // Upsert into cache (using insert instead of upsert based on schema)
      // Since it's a log, we insert new row.
      await supabase.from('currency_rates').insert({
        base_currency: 'USD',
        rates: json.rates,
        fetched_at: new Date().toISOString()
      });

      return new Response(JSON.stringify(json.rates), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (req.method === 'GET' && url.pathname.endsWith('/countries')) {
      if (cachedCountries) {
        return new Response(JSON.stringify(cachedCountries), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      const res = await fetch('https://restcountries.com/v3.1/all?fields=name,currencies');
      const raw = await res.json();

      const list = raw
        .filter((c: any) => c.currencies)
        .map((c: any) => {
          const code = Object.keys(c.currencies)[0];
          return {
            country: c.name.common,
            currencyCode: code,
            currencySymbol: c.currencies[code]?.symbol || code
          };
        })
        .sort((a: any, b: any) => a.country.localeCompare(b.country));

      cachedCountries = list;

      return new Response(JSON.stringify(list), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: true, message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
