import { supabase } from './supabase'

export const testSupabaseConnection = async () => {
  try {
    console.log('🧪 Testing Supabase connection...')
    console.log('ENV:', {
      url: import.meta.env.VITE_SUPABASE_URL,
      key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0, 20) + '...',
    })

    // Test 1: Simple select
    console.log('📌 Test 1: Simple SELECT from expenses')
    const { data: testData, error: testError } = await supabase.from('expenses').select('count', { count: 'exact' })
    if (testError) {
      console.error('❌ SELECT error:', testError)
    } else {
      console.log('✅ SELECT successful')
    }

    // Test 2: Fetch all expenses
    console.log('📌 Test 2: Fetch all expenses with full columns')
    const { data, error, status } = await supabase
      .from('expenses')
      .select('*')
      .limit(5)

    console.log('Response status:', status)
    if (error) {
      console.error('❌ Fetch error:', error.message, error.code, error.details)
      return false
    }

    console.log('✅ Expenses fetched:', data?.length || 0, 'records')
    if (data && data.length > 0) {
      console.log('📊 Sample expense:', data[0])
      console.log('📋 Columns:', Object.keys(data[0]))
    }

    return true
  } catch (e) {
    console.error('❌ Exception:', e.message)
    return false
  }
}
