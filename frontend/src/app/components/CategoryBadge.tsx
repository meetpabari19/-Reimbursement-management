interface CategoryBadgeProps {
  category: string;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs"
      style={{
        backgroundColor: '#eef3fd',
        color: '#2f5bae',
        fontFamily: 'var(--font-body)',
      }}
    >
      {category}
    </span>
  );
}
