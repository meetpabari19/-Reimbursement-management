/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables! Please check your .env.local file.");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

/**
 * Call Edge Functions — injects auth token if available, but doesn't block if missing.
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string, 
  options: any = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('apikey', supabaseAnonKey);

  // Try to attach auth token if user is logged in, but use the anon key if not
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    } else {
      headers.set('Authorization', `Bearer ${supabaseAnonKey}`);
    }
  } catch {
    // Fallback if auth fails entirely
    headers.set('Authorization', `Bearer ${supabaseAnonKey}`);
  }
  
  // Handle FormData vs JSON payloads
  if (options.body instanceof FormData) {
    headers.delete('Content-Type');
  } else if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let bodyValue = options.body;
  if (bodyValue && typeof bodyValue === 'object' && !(bodyValue instanceof FormData)) {
    bodyValue = JSON.stringify(bodyValue);
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: options.method || 'GET',
    headers,
    body: bodyValue
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  let result;
  
  if (isJson) {
    result = await response.json();
  } else {
    result = await response.text();
  }

  if (!response.ok) {
    const msg = result?.message || result?.error || `API error (${response.status})`;
    console.error(`Edge Function [${functionName}] ${response.status}:`, result);
    throw new Error(msg);
  }

  return result as T;
}
