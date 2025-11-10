import { NavLink } from 'react-router-dom';
import { Fragment } from 'react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/clients', label: 'Clients & Vendors' },
  { to: '/enquiries', label: 'Enquiries & Quotations' },
  { to: '/orders', label: 'Orders' },
  { to: '/finance', label: 'Finance' },
  { to: '/logistics', label: 'Logistics' },
  { to: '/reporting', label: 'Reporting' },
  { to: '/settings', label: 'Settings' }
];

const Sidebar = () => {
  return (
    <aside className="flex w-72 flex-col border-r border-slate-200 bg-white">
      <div className="px-6 py-5 text-xl font-semibold text-primary">Anva CRM</div>
      <nav className="flex-1 space-y-1 px-3 pb-6">
        {navItems.map((item) => (
          <Fragment key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-100 ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-slate-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          </Fragment>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
