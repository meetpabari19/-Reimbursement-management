import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { MetricCard } from '../components/MetricCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { GhostButton } from '../components/GhostButton';
import { StatusChip } from '../components/StatusChip';
import { CategoryBadge } from '../components/CategoryBadge';
import { ApprovalStepper } from '../components/ApprovalStepper';
import { SubmitExpenseModal } from '../components/SubmitExpenseModal';
import { ExpenseDetailModal } from '../components/ExpenseDetailModal';
import type { Expense } from '../types';
import { supabase, invokeEdgeFunction } from '../../api/supabase';
import { Loader2 } from 'lucide-react';

/**
 * Maps raw API expense data to the frontend Expense type.
 * Backend returns: currency_code, amount_usd, submitted_at, etc.
 * Frontend types use: currency, usdEquiv, submittedAt, etc.
 */
function mapExpense(raw: any): Expense {
  return {
    id: raw.id,
    date: raw.date,
    category: raw.category || 'Other',
    description: raw.description || '',
    amount: typeof raw.amount === 'number' ? raw.amount : parseFloat(raw.amount) || 0,
    currency: raw.currency_code || raw.currency || 'USD',
    usdEquiv: typeof raw.amount_usd === 'number' ? raw.amount_usd : parseFloat(raw.amount_usd) || 0,
    status: raw.status || 'pending',
    approvalSteps: (raw.expense_approvals || []).map((a: any) => ({
      status: a.action === 'approved' ? 'done' as const
        : a.action === 'rejected' ? 'rejected' as const
        : 'active' as const,
      label: a.approver?.name || 'Approver',
    })),
    comments: (raw.expense_approvals || [])
      .filter((a: any) => a.comment)
      .map((a: any) => ({
        actor: a.approver?.name || 'Approver',
        comment: a.comment,
        timestamp: a.acted_at,
      })),
    submittedBy: raw.submitter_name || undefined,
    submittedAt: raw.submitted_at || raw.created_at,
    paymentMethod: raw.ocr_raw?.paymentMethod || undefined,
    merchantName: raw.ocr_raw?.merchant || undefined,
    receiptUrl: raw.receipt_url || undefined,
    notes: raw.ocr_raw?.purpose || undefined,
    project: raw.ocr_raw?.projectCode || undefined,
  };
}

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'history' | 'pending'>('history');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Attempt to get user, but default to anonymous if none
      const { data: { user } } = await supabase.auth.getUser();
      
      setUserEmail(user?.email || 'anonymous@reimbursex.demo');
      setUserName(user?.user_metadata?.name || user?.email?.split('@')[0] || 'Guest User');

      try {
        const data = await invokeEdgeFunction('expenses/my', { method: 'GET' });
        const mapped = Array.isArray(data) ? data.map(mapExpense) : [];
        setExpenses(mapped);
      } catch (apiError: any) {
        console.error("Failed to load expenses:", apiError);
        setExpenses([]);
        setError(`Could not load expenses: ${apiError.message}`);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    // Listen for sign-out only
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/');
      }
    });

    // One-shot initial data load
    const init = async () => {
      await new Promise(r => setTimeout(r, 100));
      if (!cancelled) {
        loadData();
      }
    };
    init();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleResubmit = async (expenseId: string) => {
    try {
      await invokeEdgeFunction(`expenses/${expenseId}/resubmit`, { method: 'PATCH' });
      loadData();
    } catch (err: any) {
      alert("Resubmit failed: " + err.message);
    }
  };

  const totalSubmitted = expenses.length;
  const pending = expenses.filter((e) => e.status === 'pending').length;
  const approved = expenses.filter((e) => e.status === 'approved').length;
  const rejected = expenses.filter((e) => e.status === 'rejected').length;
  const totalApprovedAmount = expenses
    .filter((e) => e.status === 'approved')
    .reduce((sum, e) => sum + (e.usdEquiv || 0), 0)
    .toFixed(2);

  const filteredExpenses = expenses.filter((expense) => {
    if (activeTab === 'pending' && expense.status !== 'pending') return false;
    if (statusFilter !== 'all' && expense.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && expense.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: '#eaf0fb' }}
    >
      {/* Radial gradient background */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-40 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(245, 160, 56, 0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div
            className="uppercase text-sm tracking-wider mb-3"
            style={{ color: '#5b759f', fontFamily: 'var(--font-body)' }}
          >
            ReimburseX · Employee Portal
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1
                className="text-4xl mb-2"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: '#0f2a52',
                  fontWeight: 600,
                }}
              >
                👋 Hello, {userName}
              </h1>
              <div className="text-sm" style={{ color: '#6f85a8' }}>
                {userEmail} • Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <div className="flex gap-3">
              <PrimaryButton onClick={() => setShowSubmitModal(true)}>
                ＋ New Expense
              </PrimaryButton>
              <GhostButton onClick={handleSignOut}>
                Sign Out
              </GhostButton>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-[#fff4db] text-[#9b6f1b] rounded-xl text-sm font-medium flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => { setError(null); loadData(); }} className="underline">Retry</button>
          </div>
        )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Total Submitted"
            count={totalSubmitted}
            subtitle="All time claims"
            dotColor="#2f6dff"
            progressColor="#2f6dff"
            progressValue={100}
          />
          <MetricCard
            label="Pending"
            count={pending}
            subtitle="Awaiting approval"
            dotColor="#f5a038"
            progressColor="#f5a038"
            progressValue={totalSubmitted > 0 ? (pending / totalSubmitted) * 100 : 0}
          />
          <MetricCard
            label="Approved"
            count={approved}
            subtitle={`$${totalApprovedAmount} reimbursed`}
            dotColor="#1d7453"
            progressColor="#1d7453"
            progressValue={totalSubmitted > 0 ? (approved / totalSubmitted) * 100 : 0}
          />
          <MetricCard
            label="Rejected"
            count={rejected}
            subtitle="Needs resubmission"
            dotColor="#9b3434"
            progressColor="#9b3434"
            progressValue={totalSubmitted > 0 ? (rejected / totalSubmitted) * 100 : 0}
          />
        </div>

        {/* Main Panel */}
        <div
          className="bg-white rounded-[14px] p-6"
          style={{ boxShadow: '0 16px 35px rgba(10, 35, 78, 0.10)' }}
        >
          {/* Tabs */}
          <div className="flex gap-8 mb-6 border-b border-[#dbe5f4]">
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 transition-all ${
                activeTab === 'history'
                  ? 'border-b-2 border-[#2f6dff]'
                  : 'border-b-2 border-transparent'
              }`}
              style={{
                color: activeTab === 'history' ? '#2f6dff' : '#6f85a8',
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
              }}
            >
              📋 Expense History
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-3 transition-all ${
                activeTab === 'pending'
                  ? 'border-b-2 border-[#2f6dff]'
                  : 'border-b-2 border-transparent'
              }`}
              style={{
                color: activeTab === 'pending' ? '#2f6dff' : '#6f85a8',
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
              }}
            >
              ⏳ Pending Approvals ({pending})
            </button>
          </div>

          {/* Filters */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 rounded-[10px] border border-[#d8e3f2] bg-white text-sm"
                style={{ color: '#335079' }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 rounded-[10px] border border-[#d8e3f2] bg-white text-sm"
                style={{ color: '#335079' }}
              >
                <option value="all">All Categories</option>
                <option value="Travel">Travel</option>
                <option value="Meals">Meals</option>
                <option value="Supplies">Supplies</option>
                <option value="Transport">Transport</option>
                <option value="Accommodation">Accommodation</option>
              </select>
            </div>

            <div className="text-sm" style={{ color: '#6f85a8' }}>
              {filteredExpenses.length} results
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#2f6dff]" />
              <p className="text-sm" style={{ color: '#6f85a8' }}>Loading expenses...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="text-5xl">📃</div>
              <p className="text-lg" style={{ color: '#335079', fontWeight: 600 }}>
                No expenses yet
              </p>
              <p className="text-sm" style={{ color: '#6f85a8' }}>
                Click "＋ New Expense" to submit your first expense claim
              </p>
            </div>
          ) : (
            /* Table */
            <div className="border border-[#dbe5f4] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-[#f7faff] sticky top-0">
                    <tr>
                      {['Date', 'Category', 'Description', 'Amount', 'USD Equiv.', 'Status', 'Approval', 'Actions'].map((header) => (
                        <th
                          key={header}
                          className="text-left px-4 py-3 text-xs uppercase tracking-wider"
                          style={{
                            fontFamily: 'var(--font-heading)',
                            color: '#335079',
                            fontWeight: 600,
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className="border-t border-[#f0f4fa] hover:bg-[#f8fbff] transition-colors"
                      >
                        <td className="px-4 py-4 text-sm" style={{ color: '#335079' }}>
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4">
                          <CategoryBadge category={expense.category} />
                        </td>
                        <td className="px-4 py-4 text-sm max-w-[200px] truncate" style={{ color: '#335079' }}>
                          {expense.description}
                        </td>
                        <td className="px-4 py-4 text-sm" style={{ color: '#335079', fontWeight: 600 }}>
                          {expense.currency} {expense.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 text-sm" style={{ color: '#6f85a8' }}>
                          ${expense.usdEquiv.toFixed(2)}
                        </td>
                        <td className="px-4 py-4">
                          <StatusChip status={expense.status} />
                        </td>
                        <td className="px-4 py-4">
                          <ApprovalStepper steps={expense.approvalSteps} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedExpense(expense)}
                              className="px-3 py-1.5 bg-[#eef4ff] text-[#2f6dff] rounded-md text-sm hover:bg-[#dce8ff] transition-all"
                              style={{ fontWeight: 500 }}
                            >
                              View
                            </button>
                            {expense.status === 'rejected' && (
                              <button
                                onClick={() => handleResubmit(expense.id)}
                                className="px-3 py-1.5 bg-[#dcf8ea] text-[#1d7453] rounded-md text-sm hover:bg-[#c8f0dc] transition-all"
                                style={{ fontWeight: 500 }}
                              >
                                Resubmit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showSubmitModal && (
        <SubmitExpenseModal
          onClose={() => setShowSubmitModal(false)}
          onSuccess={() => {
            setShowSubmitModal(false);
            loadData();
          }}
        />
      )}
      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
        />
      )}
    </div>
  );
}