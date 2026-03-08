'use client';

const SettingsPage = () => {
  const settingsOptions = [
    {
      title: 'Supabase integration',
      description: 'Configure project URL and anonymous key to persist CRM data securely in Supabase tables.'
    },
    {
      title: 'Document templates',
      description:
        'Manage bilingual (English/Arabic) quotation, invoice, and delivery note templates to align with UAE commercial practices.'
    },
    {
      title: 'Tax configuration',
      description:
        'Review VAT and corporate tax presets. Adjust zero-rated sectors, exemption categories, and rounding rules as needed.'
    },
    {
      title: 'Approval workflows',
      description: 'Define approval thresholds for quotations, purchase orders, and invoices to ensure governance.'
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Tailor the CRM to your corporate structure, compliance requirements, and document preferences.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {settingsOptions.map((option) => (
          <div key={option.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{option.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{option.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsPage;
