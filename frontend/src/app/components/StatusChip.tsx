interface StatusChipProps {
  status: 'pending' | 'approved' | 'rejected' | 'draft';
}

export function StatusChip({ status }: StatusChipProps) {
  const styles = {
    pending: 'bg-[#fff4db] text-[#9b6f1b]',
    approved: 'bg-[#dcf8ea] text-[#1d7453]',
    rejected: 'bg-[#fde5e5] text-[#9b3434]',
    draft: 'bg-[#eee8ff] text-[#5b3bbf]',
  };

  const labels = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    draft: 'Draft',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {labels[status]}
    </span>
  );
}
