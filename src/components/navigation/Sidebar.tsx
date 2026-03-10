'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/dashboard/enquiries', label: 'Enquiries' },
  { to: '/dashboard/quotations', label: 'Quotations' },
  { to: '/clients', label: 'Clients' },
  { to: '/vendors', label: 'Vendors' },
  { to: '/dashboard/sales-orders', label: 'Sale Orders' },
  { to: '/dashboard/invoices', label: 'Invoices' },
  { to: '/logistics', label: 'Logistics' },
  { to: '/reporting', label: 'Reporting' },
  { to: '/settings', label: 'Settings' }
];

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="flex w-72 flex-col border-r border-slate-200 bg-white">
      <div className="px-6 py-5 text-xl font-semibold text-primary">Anva CRM</div>
      <nav className="flex-1 space-y-1 px-3 pb-6">
        {navItems.map((item) => {
          const isActive = pathname === item.to;

          return (
            <Fragment key={item.to}>
              <Link
                href={item.to}
                className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-100 ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-slate-700'
                }`}
              >
                {item.label}
              </Link>
            </Fragment>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
