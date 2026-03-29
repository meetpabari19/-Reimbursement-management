interface MetricCardProps {
  label: string;
  count: number;
  subtitle: string;
  dotColor: string;
  progressColor: string;
  progressValue: number; // 0-100
}

export function MetricCard({
  label,
  count,
  subtitle,
  dotColor,
  progressColor,
  progressValue,
}: MetricCardProps) {
  return (
    <div
      className="bg-white rounded-[14px] p-5 border border-[#d8e3f2] flex flex-col gap-3"
      style={{
        boxShadow: '0 16px 35px rgba(10, 35, 78, 0.10)',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <span
          className="uppercase text-[0.81rem] tracking-wider"
          style={{ color: '#5b759f', fontFamily: 'var(--font-body)' }}
        >
          {label}
        </span>
      </div>

      <div
        className="text-3xl"
        style={{
          fontFamily: 'var(--font-heading)',
          color: '#0f2a52',
          fontWeight: 600,
        }}
      >
        {count}
      </div>

      <div className="text-sm" style={{ color: '#6f85a8' }}>
        {subtitle}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-[#f0f4fa] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progressValue}%`,
            backgroundColor: progressColor,
          }}
        />
      </div>
    </div>
  );
}
