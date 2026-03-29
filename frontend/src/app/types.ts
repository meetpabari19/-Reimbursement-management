import type { StepStatus } from './components/ApprovalStepper';

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  usdEquiv: number;
  status: 'pending' | 'approved' | 'rejected' | 'draft';
  approvalSteps: { status: StepStatus; label: string }[];
  comments?: { actor: string; comment: string; timestamp?: string }[];
  submittedBy?: string;
  submittedAt?: string;
  department?: string;
  project?: string;
  paymentMethod?: string;
  merchantName?: string;
  receiptUrl?: string;
  reimbursementDate?: string;
  notes?: string;
}
