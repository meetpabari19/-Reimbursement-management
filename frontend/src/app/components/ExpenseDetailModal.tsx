import { X, Receipt, Calendar, User, Building2, CreditCard, FileText, Clock, DollarSign, Download, Eye } from 'lucide-react';
import { PrimaryButton } from './PrimaryButton';
import { GhostButton } from './GhostButton';
import { StatusChip } from './StatusChip';
import { ApprovalStepper } from './ApprovalStepper';
import { CategoryBadge } from './CategoryBadge';
import type { Expense } from '../types';

interface ExpenseDetailModalProps {
  expense: Expense;
  onClose: () => void;
}

export function ExpenseDetailModal({
  expense,
  onClose,
}: ExpenseDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#08162f]"
        style={{ opacity: 0.48, backdropFilter: 'blur(4px)' }}
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-[18px] w-full max-w-[720px] max-h-[90vh] overflow-y-auto p-8"
        style={{ boxShadow: '0 24px 60px rgba(8, 22, 47, 0.22)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-[#6f85a8] hover:text-[#335079] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6 pr-8">
          <div className="flex items-start justify-between mb-2">
            <h3
              className="text-2xl flex-1"
              style={{
                fontFamily: 'var(--font-heading)',
                color: '#0f2a52',
                fontWeight: 600,
              }}
            >
              {expense.description}
            </h3>
            <StatusChip status={expense.status} />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm" style={{ color: '#6f85a8' }}>
              <span style={{ fontWeight: 500 }}>Expense ID:</span> {expense.id}
            </p>
            <span style={{ color: '#cdd9ec' }}>•</span>
            <p className="text-sm" style={{ color: '#6f85a8' }}>
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              {new Date(expense.date).toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </p>
            {expense.submittedAt && (
              <>
                <span style={{ color: '#cdd9ec' }}>•</span>
                <p className="text-sm" style={{ color: '#6f85a8' }}>
                  <Clock className="w-3.5 h-3.5 inline mr-1" />
                  Submitted {new Date(expense.submittedAt).toLocaleDateString()}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Amount Highlight Card */}
        <div
          className="p-6 rounded-[14px] mb-6"
          style={{ 
            background: 'linear-gradient(135deg, #2f6dff 0%, #1e52cc 100%)',
            boxShadow: '0 4px 16px rgba(47, 109, 255, 0.2)'
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-white/70 text-sm mb-1">
                Expense Amount
              </div>
              <div
                className="text-4xl text-white mb-1"
                style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}
              >
                {expense.currency} {expense.amount.toFixed(2)}
              </div>
              <div className="text-white/80 text-sm">
                ≈ ${expense.usdEquiv.toFixed(2)} USD
              </div>
            </div>
            <div className="bg-white/10 p-3 rounded-xl">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        {/* Key Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div
            className="p-4 rounded-[14px]"
            style={{ backgroundColor: '#f6f8fd' }}
          >
            <div
              className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5"
              style={{ color: '#6f85a8' }}
            >
              <FileText className="w-3.5 h-3.5" />
              Category
            </div>
            <div>
              <CategoryBadge category={expense.category} />
            </div>
          </div>

          <div
            className="p-4 rounded-[14px]"
            style={{ backgroundColor: '#f6f8fd' }}
          >
            <div
              className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5"
              style={{ color: '#6f85a8' }}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Payment Method
            </div>
            <div
              className="text-base"
              style={{ color: '#335079', fontWeight: 600 }}
            >
              {expense.paymentMethod || 'Personal Card'}
            </div>
          </div>

          {expense.merchantName && (
            <div
              className="p-4 rounded-[14px]"
              style={{ backgroundColor: '#f6f8fd' }}
            >
              <div
                className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5"
                style={{ color: '#6f85a8' }}
              >
                <Building2 className="w-3.5 h-3.5" />
                Merchant
              </div>
              <div
                className="text-base"
                style={{ color: '#335079', fontWeight: 600 }}
              >
                {expense.merchantName}
              </div>
            </div>
          )}

          {expense.department && (
            <div
              className="p-4 rounded-[14px]"
              style={{ backgroundColor: '#f6f8fd' }}
            >
              <div
                className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5"
                style={{ color: '#6f85a8' }}
              >
                <Building2 className="w-3.5 h-3.5" />
                Department
              </div>
              <div
                className="text-base"
                style={{ color: '#335079', fontWeight: 600 }}
              >
                {expense.department}
              </div>
            </div>
          )}

          {expense.project && (
            <div
              className="p-4 rounded-[14px] col-span-2"
              style={{ backgroundColor: '#f6f8fd' }}
            >
              <div
                className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5"
                style={{ color: '#6f85a8' }}
              >
                <FileText className="w-3.5 h-3.5" />
                Project / Purpose
              </div>
              <div
                className="text-base"
                style={{ color: '#335079', fontWeight: 600 }}
              >
                {expense.project}
              </div>
            </div>
          )}

          {expense.submittedBy && (
            <div
              className="p-4 rounded-[14px]"
              style={{ backgroundColor: '#f6f8fd' }}
            >
              <div
                className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5"
                style={{ color: '#6f85a8' }}
              >
                <User className="w-3.5 h-3.5" />
                Submitted By
              </div>
              <div
                className="text-base"
                style={{ color: '#335079', fontWeight: 600 }}
              >
                {expense.submittedBy}
              </div>
            </div>
          )}

          {expense.reimbursementDate && (
            <div
              className="p-4 rounded-[14px]"
              style={{ backgroundColor: '#f6f8fd' }}
            >
              <div
                className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5"
                style={{ color: '#6f85a8' }}
              >
                <Calendar className="w-3.5 h-3.5" />
                Reimbursement Date
              </div>
              <div
                className="text-base"
                style={{ color: '#335079', fontWeight: 600 }}
              >
                {new Date(expense.reimbursementDate).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>

        {/* Notes Section */}
        {expense.notes && (
          <div
            className="p-5 rounded-[14px] mb-6"
            style={{ backgroundColor: '#f6f8fd' }}
          >
            <div
              className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5"
              style={{ color: '#6f85a8' }}
            >
              <FileText className="w-3.5 h-3.5" />
              Additional Notes
            </div>
            <div
              className="text-sm leading-relaxed"
              style={{ color: '#335079' }}
            >
              {expense.notes}
            </div>
          </div>
        )}

        {/* Receipt Attachment */}
        {expense.receiptUrl && (
          <div
            className="p-5 rounded-[14px] mb-6"
            style={{ backgroundColor: '#f6f8fd' }}
          >
            <div
              className="text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5"
              style={{ color: '#6f85a8' }}
            >
              <Receipt className="w-3.5 h-3.5" />
              Receipt Attachment
            </div>
            <div className="flex items-center gap-3">
              <div
                className="flex-1 p-3 rounded-lg border-2 border-dashed flex items-center gap-3"
                style={{ borderColor: '#cdd9ec' }}
              >
                <div className="w-10 h-10 rounded bg-[#2f6dff]/10 flex items-center justify-center">
                  <Receipt className="w-5 h-5" style={{ color: '#2f6dff' }} />
                </div>
                <div className="flex-1">
                  <div
                    className="text-sm mb-0.5"
                    style={{ color: '#335079', fontWeight: 600 }}
                  >
                    receipt-{expense.id}.pdf
                  </div>
                  <div className="text-xs" style={{ color: '#6f85a8' }}>
                    Uploaded with expense
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="p-2.5 rounded-lg transition-colors"
                  style={{ backgroundColor: '#e8f0ff', color: '#2f6dff' }}
                  title="View Receipt"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  className="p-2.5 rounded-lg transition-colors"
                  style={{ backgroundColor: '#e8f0ff', color: '#2f6dff' }}
                  title="Download Receipt"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approval Progress */}
        <div
          className="p-5 rounded-[14px] mb-6"
          style={{ backgroundColor: '#f6f8fd' }}
        >
          <div
            className="text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5"
            style={{ color: '#6f85a8' }}
          >
            <FileText className="w-3.5 h-3.5" />
            Approval Progress
          </div>
          <div className="flex justify-center mb-4">
            <ApprovalStepper steps={expense.approvalSteps} />
          </div>

          {/* Comments */}
          {expense.comments && expense.comments.length > 0 && (
            <div className="mt-5 pt-5 border-t" style={{ borderColor: '#cdd9ec' }}>
              <div
                className="text-xs uppercase tracking-wider mb-3"
                style={{ color: '#6f85a8' }}
              >
                Review Comments
              </div>
              <div className="space-y-3">
                {expense.comments.map((comment, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: 'white' }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="text-sm flex items-center gap-2"
                        style={{ fontWeight: 600, color: '#335079' }}
                      >
                        <User className="w-3.5 h-3.5" />
                        {comment.actor}
                      </span>
                      {comment.timestamp && (
                        <span className="text-xs" style={{ color: '#6f85a8' }}>
                          {new Date(comment.timestamp).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="text-sm" style={{ color: '#6f85a8' }}>
                      {comment.comment}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Activity Timeline */}
        <div
          className="p-5 rounded-[14px] mb-6"
          style={{ backgroundColor: '#f6f8fd' }}
        >
          <div
            className="text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5"
            style={{ color: '#6f85a8' }}
          >
            <Clock className="w-3.5 h-3.5" />
            Activity Timeline
          </div>
          <div className="space-y-3">
            {expense.reimbursementDate && expense.status === 'approved' && (
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-[#1d7453] mt-1.5"></div>
                <div className="flex-1">
                  <div className="text-sm" style={{ color: '#335079', fontWeight: 600 }}>
                    Reimbursement Processed
                  </div>
                  <div className="text-xs" style={{ color: '#6f85a8' }}>
                    {new Date(expense.reimbursementDate).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
            
            {expense.status === 'approved' && (
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-[#1d7453] mt-1.5"></div>
                <div className="flex-1">
                  <div className="text-sm" style={{ color: '#335079', fontWeight: 600 }}>
                    Expense Approved
                  </div>
                  <div className="text-xs" style={{ color: '#6f85a8' }}>
                    Approved by Finance Department
                  </div>
                </div>
              </div>
            )}

            {expense.status === 'rejected' && (
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-[#c52a1a] mt-1.5"></div>
                <div className="flex-1">
                  <div className="text-sm" style={{ color: '#335079', fontWeight: 600 }}>
                    Expense Rejected
                  </div>
                  <div className="text-xs" style={{ color: '#6f85a8' }}>
                    See comments for details
                  </div>
                </div>
              </div>
            )}

            {expense.status === 'pending' && (
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-[#9b6f1b] mt-1.5"></div>
                <div className="flex-1">
                  <div className="text-sm" style={{ color: '#335079', fontWeight: 600 }}>
                    Under Review
                  </div>
                  <div className="text-xs" style={{ color: '#6f85a8' }}>
                    Awaiting approval from manager
                  </div>
                </div>
              </div>
            )}

            {expense.submittedAt && (
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-[#6f85a8] mt-1.5"></div>
                <div className="flex-1">
                  <div className="text-sm" style={{ color: '#335079', fontWeight: 600 }}>
                    Expense Submitted
                  </div>
                  <div className="text-xs" style={{ color: '#6f85a8' }}>
                    {new Date(expense.submittedAt).toLocaleString()} by {expense.submittedBy || 'You'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: '#cdd9ec' }}>
          <GhostButton onClick={onClose}>Close</GhostButton>
          <div className="flex gap-3">
            {expense.status === 'draft' && (
              <>
                <GhostButton onClick={onClose}>Edit Expense</GhostButton>
                <PrimaryButton onClick={onClose}>Submit for Approval →</PrimaryButton>
              </>
            )}
            {expense.status === 'approved' && (
              <PrimaryButton onClick={onClose}>Download Receipt</PrimaryButton>
            )}
            {expense.status === 'rejected' && (
              <PrimaryButton onClick={onClose}>Revise & Resubmit</PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}