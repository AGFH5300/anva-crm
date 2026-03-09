'use client';

import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  href?: string;
}

const StatCard = ({ title, value, subtitle, href }: StatCardProps) => {
  const content = (
    <>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-xl bg-white p-5 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30">
        {content}
      </Link>
    );
  }

  return <div className="rounded-xl bg-white p-5 shadow-sm">{content}</div>;
};

export default StatCard;
