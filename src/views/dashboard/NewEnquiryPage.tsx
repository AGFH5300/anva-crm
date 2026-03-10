'use client';

import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addEnquiryLine, createEnquiry, listActiveJobTypes, listActiveSalesUsers, listClients } from '@/lib/crmApi';
import { JobType, SalesUser, SUPPORTED_CURRENCIES } from '@/types/crm';

type EnquiryLineForm = {
  id: string;
  serialNo: string;
  partNumber: string;
  description: string;
  quantity: string;
};

type EnquirySummary = {
  jobTypeId: string;
  salesPicUserId: string;
  picName: string;
  picPhone: string;
  picEmail: string;
  vesselName: string;
  vesselImoNumber: string;
  shipyard: string;
  hullNumber: string;
  forValue: string;
  make: string;
  type: string;
  serialNumber: string;
  clientReferenceNumber: string;
};

const createLine = (index: number): EnquiryLineForm => ({
  id: `line-${Date.now()}-${index}`,
  serialNo: String(index),
  partNumber: '',
  description: '',
  quantity: '1'
});

const NewEnquiryPage = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<EnquirySummary>({
    jobTypeId: '',
    salesPicUserId: '',
    picName: '',
    picPhone: '',
    picEmail: '',
    vesselName: '',
    vesselImoNumber: '',
    shipyard: '',
    hullNumber: '',
    forValue: '',
    make: '',
    type: '',
    serialNumber: '',
    clientReferenceNumber: ''
  });
  const [lines, setLines] = useState<EnquiryLineForm[]>([createLine(1)]);
  const [customerOptions, setCustomerOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [jobTypeOptions, setJobTypeOptions] = useState<JobType[]>([]);
  const [salesPicOptions, setSalesPicOptions] = useState<SalesUser[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingJobTypes, setIsLoadingJobTypes] = useState(true);
  const [isLoadingSalesPeople, setIsLoadingSalesPeople] = useState(true);
  const [customerLoadError, setCustomerLoadError] = useState<string | null>(null);
  const [jobTypeLoadError, setJobTypeLoadError] = useState<string | null>(null);
  const [salesPeopleLoadError, setSalesPeopleLoadError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoadingCustomers(true);
    setIsLoadingJobTypes(true);
    setIsLoadingSalesPeople(true);

    listClients()
      .then((clients) => {
        setCustomerOptions(clients);
        setCustomerLoadError(null);
      })
      .catch((err: Error) => {
        setCustomerOptions([]);
        setCustomerLoadError(err.message);
      })
      .finally(() => setIsLoadingCustomers(false));

    listActiveJobTypes()
      .then((jobTypes) => {
        setJobTypeOptions(jobTypes);
        setJobTypeLoadError(null);
      })
      .catch((err: Error) => {
        setJobTypeOptions([]);
        setJobTypeLoadError(err.message);
      })
      .finally(() => setIsLoadingJobTypes(false));

    listActiveSalesUsers()
      .then((salesUsers) => {
        setSalesPicOptions(salesUsers);
        setSalesPeopleLoadError(null);
      })
      .catch((err: Error) => {
        setSalesPicOptions([]);
        setSalesPeopleLoadError(err.message);
      })
      .finally(() => setIsLoadingSalesPeople(false));
  }, []);

  const addItemLine = () => {
    setLines((prev) => [...prev, createLine(prev.length + 1)]);
  };

  const removeItemLine = (id: string) => {
    setLines((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((line) => line.id !== id);
    });
  };

  const updateSummary = (field: keyof EnquirySummary, value: string) => {
    setSummary((prev) => ({ ...prev, [field]: value }));
  };

  const updateLine = (id: string, field: keyof EnquiryLineForm, value: string) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
  };

  const onQuantityTab = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Tab' && !event.shiftKey && index === lines.length - 1) {
      addItemLine();
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const selectedClientId = String(form.get('clientId') ?? '').trim();

    try {
      if (!selectedClientId) {
        throw new Error('Please select a client.');
      }

      if (!summary.jobTypeId) {
        throw new Error('Job Type is required.');
      }

      const enquiry = await createEnquiry({
        clientId: selectedClientId,
        jobTypeId: summary.jobTypeId,
        salesPicUserId: summary.salesPicUserId || undefined,
        picName: summary.picName || undefined,
        picPhone: summary.picPhone || undefined,
        picEmail: summary.picEmail || undefined,
        vesselName: summary.vesselName,
        vesselImoNumber: summary.vesselImoNumber || undefined,
        shipyard: summary.shipyard || undefined,
        hullNumber: summary.hullNumber || undefined,
        machineryFor: summary.forValue || undefined,
        machineryMake: summary.make || undefined,
        machineryType: summary.type || undefined,
        machinerySerialNo: summary.serialNumber || undefined,
        clientReferenceNumber: summary.clientReferenceNumber || undefined
      });

      const lineItems = lines
        .map((line) => ({
          itemSerialNo: line.serialNo.trim() || undefined,
          description: line.description.trim(),
          partNo: line.partNumber.trim() || undefined,
          quantity: Number(line.quantity),
          unitPrice: 0,
          currency: 'AED' as (typeof SUPPORTED_CURRENCIES)[number],
          vatRate: 5,
          isZeroRated: false,
          isExempt: false
        }))
        .filter((line) => line.description.length > 0 && Number.isFinite(line.quantity) && line.quantity > 0);

      if (!lineItems.length) {
        throw new Error('Please add at least one item with description and quantity.');
      }

      await Promise.all(lineItems.map((line) => addEnquiryLine(enquiry.id, line)));

      router.push(`/dashboard/enquiries/${enquiry.id}?created=1`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">New enquiry</h1>
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <select name="clientId" className="w-full rounded border p-2" required>
          <option value="">Select customer</option>
          {customerOptions.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
        {isLoadingCustomers ? <p className="text-xs text-slate-500">Loading...</p> : null}
        {!isLoadingCustomers && !customerLoadError && customerOptions.length === 0 ? <p className="text-xs text-slate-500">No records found</p> : null}
        {customerLoadError ? <p className="text-xs text-red-600">{customerLoadError}</p> : null}

        <hr />

        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <select value={summary.jobTypeId} onChange={(event) => updateSummary('jobTypeId', event.target.value)} className="w-full rounded border p-2" required>
              <option value="">Select Job Type</option>
              {jobTypeOptions.map((jobType) => (
                <option key={jobType.id} value={jobType.id}>
                  {jobType.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">Job Type is required.</p>
            {isLoadingJobTypes ? <p className="mt-1 text-xs text-slate-500">Loading...</p> : null}
            {!isLoadingJobTypes && !jobTypeLoadError && jobTypeOptions.length === 0 ? <p className="mt-1 text-xs text-slate-500">No records found</p> : null}
            {jobTypeLoadError ? <p className="mt-1 text-xs text-red-600">{jobTypeLoadError}</p> : null}
          </div>
          <div>
            <select value={summary.salesPicUserId} onChange={(event) => updateSummary('salesPicUserId', event.target.value)} className="w-full rounded border p-2">
              <option value="">Sales PIC (optional)</option>
              {salesPicOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}{user.email ? ` (${user.email})` : ''}
                </option>
              ))}
            </select>
            {isLoadingSalesPeople ? <p className="mt-1 text-xs text-slate-500">Loading...</p> : null}
            {!isLoadingSalesPeople && !salesPeopleLoadError && salesPicOptions.length === 0 ? <p className="mt-1 text-xs text-slate-500">No records found</p> : null}
            {salesPeopleLoadError ? <p className="mt-1 text-xs text-red-600">{salesPeopleLoadError}</p> : null}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <input value={summary.picName} onChange={(event) => updateSummary('picName', event.target.value)} className="rounded border p-2" placeholder="PIC name" />
          <input value={summary.picPhone} onChange={(event) => updateSummary('picPhone', event.target.value)} className="rounded border p-2" placeholder="PIC phone" />
          <input value={summary.picEmail} onChange={(event) => updateSummary('picEmail', event.target.value)} type="email" className="rounded border p-2 md:col-span-2" placeholder="PIC email" />
          <input value={summary.vesselName} onChange={(event) => updateSummary('vesselName', event.target.value)} className="rounded border p-2" placeholder="Vessel name" required />
          <input value={summary.clientReferenceNumber} onChange={(event) => updateSummary('clientReferenceNumber', event.target.value)} className="rounded border p-2" placeholder="Client reference number" />
          <input value={summary.vesselImoNumber} onChange={(event) => updateSummary('vesselImoNumber', event.target.value)} className="rounded border p-2" placeholder="IMO (optional)" />
          <input value={summary.shipyard} onChange={(event) => updateSummary('shipyard', event.target.value)} className="rounded border p-2" placeholder="Shipyard (optional)" />
          <input value={summary.hullNumber} onChange={(event) => updateSummary('hullNumber', event.target.value)} className="rounded border p-2" placeholder="Hull number (optional)" />
        </div>

        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-[110px,1fr] items-center gap-2 text-sm text-slate-700">
            <span className="rounded border border-slate-200 bg-white px-2 py-2 font-medium text-slate-600">FOR</span>
            <input value={summary.forValue} onChange={(event) => updateSummary('forValue', event.target.value)} className="rounded border p-2" placeholder="MGPS" />
          </div>
          <div className="grid grid-cols-[110px,1fr] items-center gap-2 text-sm text-slate-700">
            <span className="rounded border border-slate-200 bg-white px-2 py-2 font-medium text-slate-600">MAKE</span>
            <input value={summary.make} onChange={(event) => updateSummary('make', event.target.value)} className="rounded border p-2" placeholder="Cathelco" />
          </div>
          <div className="grid grid-cols-[110px,1fr] items-center gap-2 text-sm text-slate-700">
            <span className="rounded border border-slate-200 bg-white px-2 py-2 font-medium text-slate-600">TYPE</span>
            <input value={summary.type} onChange={(event) => updateSummary('type', event.target.value)} className="rounded border p-2" placeholder="16C-DW" />
          </div>
          <div className="grid grid-cols-[110px,1fr] items-center gap-2 text-sm text-slate-700">
            <span className="rounded border border-slate-200 bg-white px-2 py-2 font-medium text-slate-600">S. No.</span>
            <input value={summary.serialNumber} onChange={(event) => updateSummary('serialNumber', event.target.value)} className="rounded border p-2" placeholder="10029876" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-[110px,1.2fr,2fr,120px,84px] gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <p>S/No</p>
            <p>Part No.</p>
            <p>Item Description</p>
            <p>Qty</p>
            <p className="text-center">Action</p>
          </div>
          {lines.map((line, index) => (
            <div key={line.id} className="grid grid-cols-[110px,1.2fr,2fr,120px,84px] gap-2">
              <input value={line.serialNo} onChange={(event) => updateLine(line.id, 'serialNo', event.target.value)} className="rounded border p-2" placeholder="1" />
              <input value={line.partNumber} onChange={(event) => updateLine(line.id, 'partNumber', event.target.value)} className="rounded border p-2" placeholder="Part number" />
              <input value={line.description} onChange={(event) => updateLine(line.id, 'description', event.target.value)} className="rounded border p-2" placeholder="Item description" required />
              <input
                value={line.quantity}
                onChange={(event) => updateLine(line.id, 'quantity', event.target.value)}
                onKeyDown={(event) => onQuantityTab(event, index)}
                name={`quantity-${line.id}`}
                type="number"
                min="0.001"
                step="0.001"
                className="rounded border p-2"
                placeholder="Quantity"
                required
              />
              <button
                type="button"
                className="rounded border border-red-200 px-2 text-xs font-medium text-red-600 disabled:opacity-40"
                disabled={lines.length === 1}
                onClick={() => removeItemLine(line.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="w-fit rounded-md border border-slate-300 px-3 py-1 text-sm" onClick={addItemLine}>
          + Add item
        </button>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Creating…' : 'Create enquiry'}
        </button>
      </form>
    </div>
  );
};

export default NewEnquiryPage;
