import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Use service role to bypass RLS entirely
    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

    // Try to get user from auth token if provided, otherwise use a default employee
    // employee_id is UUID, so we MUST use null if they are anonymous!
    let userId: string | null = null;
    let userName = 'Guest';
    let companyId = null;
    let managerId = null;

    const authHeader = req.headers.get('Authorization') || '';
    if (authHeader) {
      try {
        const tokenClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await tokenClient.auth.getUser();
        if (user) {
          userId = user.id;
          userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Employee';

          // Try to get profile
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          if (profile) {
            userName = profile.name || userName;
            companyId = profile.company_id;
            managerId = profile.manager_id;
          }
        }
      } catch {
        // Auth failed — proceed with defaults, no blocking
      }
    }

    const segments = url.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || '';

    // ─── POST /expenses — Create expense ───
    if (req.method === 'POST' && (lastSegment === 'expenses' || segments.length <= 2)) {
      const body = await req.json();
      const { category, description, amount, currency_code, date, receipt_url, ocr_raw } = body;

      if (!category || !description || !amount || !currency_code || !date) {
        return new Response(
          JSON.stringify({ error: true, message: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let amount_usd = parseFloat(amount);
      if (currency_code !== 'USD') {
        try {
          const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
          const json = await res.json();
          const rate = json.rates?.[currency_code];
          if (rate) amount_usd = parseFloat((parseFloat(amount) / rate).toFixed(2));
        } catch {
          // Conversion failed — use original amount
        }
      }

      // Look up rule set
      let ruleSetId = null;
      if (companyId) {
        const { data: ruleSet } = await supabase
          .from('approval_rule_sets')
          .select('id')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .single();
        if (ruleSet) ruleSetId = ruleSet.id;
      }

      const insertPayload: Record<string, unknown> = {
        company_id:    companyId,
        employee_id:   userId, // Will be null for anonymous, which avoids UUID parse errors!
        rule_set_id:   ruleSetId,
        category,
        description,
        amount:        parseFloat(amount),
        currency_code,
        amount_usd,
        date,
        receipt_url:   receipt_url || null,
        status:        'pending',
        current_step:  1
      };
      if (ocr_raw && typeof ocr_raw === 'object') {
        insertPayload.ocr_raw = ocr_raw;
      }

      const { data: expense, error: insertError } = await supabase
        .from('expenses')
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(insertError.message);
      }

      return new Response(JSON.stringify(expense), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // ─── GET /expenses/my — List expenses ───
    if (req.method === 'GET' && lastSegment === 'my') {
      const statusParam = url.searchParams.get('status');
      const categoryParam = url.searchParams.get('category');

      let query = supabase
        .from('expenses')
        .select(`
          *,
          expense_approvals (
            step_order,
            action,
            comment,
            acted_at,
            approver:approver_id ( name )
          )
        `)
        .order('created_at', { ascending: false });
        
      if (userId) {
        query = query.eq('employee_id', userId);
      } else {
        query = query.is('employee_id', null);
      }

      if (statusParam) query = query.eq('status', statusParam);
      if (categoryParam) query = query.eq('category', categoryParam);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // ─── PATCH /expenses/:id/resubmit ───
    if (req.method === 'PATCH' && lastSegment === 'resubmit') {
      const expenseId = segments[segments.length - 2];

      const { data: expense } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expenseId)
        .single();

      if (!expense) {
        return new Response(
          JSON.stringify({ error: true, message: 'Expense not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase.from('expense_approvals').delete().eq('expense_id', expenseId);
      await supabase.from('expenses').update({
        status: 'pending', current_step: 1, resolved_at: null,
        submitted_at: new Date().toISOString()
      }).eq('id', expenseId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // ─── GET /expenses/:id ───
    if (req.method === 'GET' && lastSegment !== 'expenses' && lastSegment !== 'my') {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_approvals (
            step_order, action, comment, acted_at,
            approver:approver_id ( name, role )
          ),
          rule_set:rule_set_id (
            rule_type,
            approval_steps (
              step_order, approver_role, is_manager_step,
              approver:approver_id ( name )
            )
          )
        `)
        .eq('id', lastSegment)
        .single();

      if (!data) {
        return new Response(
          JSON.stringify({ error: true, message: 'Not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Route not found' }), { status: 404, headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Expenses error:', err);
    return new Response(JSON.stringify({ error: true, message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
