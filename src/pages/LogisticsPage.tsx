const LogisticsPage = () => {
  const roadmapItems = [
    {
      title: 'Delivery notes',
      description:
        'Generate delivery notes directly from sales orders including UAE customs compliant descriptions and proof of delivery fields.'
    },
    {
      title: 'Shipment tracking',
      description:
        'Integrate carrier tracking numbers, expected arrival times, and status updates for complete fulfilment visibility.'
    },
    {
      title: 'Proof of delivery',
      description:
        'Capture customer signatures or photo evidence to ensure documentation is audit ready for VAT zero-rating claims.'
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Logistics & Delivery</h1>
        <p className="text-sm text-slate-500">
          Control the fulfilment process and maintain delivery documents aligned with UAE commercial law.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {roadmapItems.map((item) => (
          <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogisticsPage;
