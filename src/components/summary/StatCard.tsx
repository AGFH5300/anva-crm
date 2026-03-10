'use client';

import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  href?: string;
}

const StatCard = ({ title, value, subtitle, href }: StatCardProps) => {
  if (href) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <Link href={href} className="text-sm font-medium text-slate-500 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30">
          {title}
        </Link>
        <p className="mt-2 text-3xl font-semibold text-slate-900">
          <Link href={href} className="underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30">
            {value}
          </Link>
        </p>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
};

export default StatCard;
