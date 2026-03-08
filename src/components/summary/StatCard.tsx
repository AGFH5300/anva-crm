'use client';

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
}

const StatCard = ({ title, value, subtitle }: StatCardProps) => {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
};

export default StatCard;
