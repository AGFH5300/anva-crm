import { useCRMStore } from '@/store/useCRMStore';
import { formatIsoDate } from '@/utils/date';

const ClientsPage = () => {
  const { clients } = useCRMStore();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Clients & Vendors</h1>
        <p className="text-sm text-slate-500">
          Maintain detailed records for due diligence, KYC, and VAT compliance.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Last interaction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
            {clients.map((client) => (
              <tr key={client.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{client.name}</td>
                <td className="px-4 py-3 capitalize">{client.type}</td>
                <td className="px-4 py-3 capitalize">{client.status}</td>
                <td className="px-4 py-3">{client.contactEmail ?? '—'}</td>
                <td className="px-4 py-3">{client.contactPhone ?? '—'}</td>
                <td className="px-4 py-3">{client.lastInteraction ? formatIsoDate(client.lastInteraction) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientsPage;
