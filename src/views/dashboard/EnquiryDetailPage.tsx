'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { addEnquiryLine, convertEnquiryToQuotationDraft, deleteEnquiryLine, getEnquiryDetail, getQuotationDetail, listActiveJobTypes, listActiveSalesUsers, updateEnquiry } from '@/lib/crmApi';
import type { Enquiry, EnquiryLine, JobType, SalesUser } from '@/types/crm';
import { formatIsoDate } from '@/utils/date';
import SupplierRfqModal from '@/components/workflows/SupplierRfqModal';

type EnquiryDetailPageProps = {
  id: string;
};

const EnquiryDetailPage = ({ id }: EnquiryDetailPageProps) => {
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [lines, setLines] = useState<EnquiryLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobTypeOptions, setJobTypeOptions] = useState<JobType[]>([]);
  const [salesPicOptions, setSalesPicOptions] = useState<SalesUser[]>([]);
  const [rfqOpen, setRfqOpen] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { enquiry, lines } = await getEnquiryDetail(id);
      setEnquiry(enquiry);
      setLines(lines);
    } catch (err) {
      setEnquiry(null);
      setLines([]);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();

    Promise.all([listActiveJobTypes(), listActiveSalesUsers()])
      .then(([jobTypes, salesUsers]) => {
        setJobTypeOptions(jobTypes);
        setSalesPicOptions(salesUsers);
      })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  const onAddLine = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await addEnquiryLine(id, {
        itemSerialNo: String(form.get('itemSerialNo') ?? '').trim() || undefined,
        partNo: String(form.get('partNo') ?? '').trim() || undefined,
        description: String(form.get('description')),
        quantity: Number(form.get('quantity')),
        unitPrice: 0,
        currency: String(form.get('currency')) as 'AED' | 'USD' | 'EUR' | 'GBP',
        vatRate: Number(form.get('vatRate')),
        isZeroRated: false,
        isExempt: false
      });
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onDeleteLine = async (lineId: string) => {
    try {
      await deleteEnquiryLine(lineId);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };


  const onSaveMetadata = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const jobTypeId = String(form.get('jobTypeId') ?? '').trim();
      if (!jobTypeId) {
        throw new Error('Job Type is required.');
      }

      await updateEnquiry(id, {
        jobTypeId,
        salesPicUserId: String(form.get('salesPicUserId') ?? '').trim() || undefined,
        picName: String(form.get('picName') ?? '').trim() || undefined,
        picPhone: String(form.get('picPhone') ?? '').trim() || undefined,
        picEmail: String(form.get('picEmail') ?? '').trim() || undefined,
        vesselName: String(form.get('vesselName') ?? '').trim(),
        vesselImoNumber: String(form.get('vesselImoNumber') ?? '').trim() || undefined,
        shipyard: String(form.get('shipyard') ?? '').trim() || undefined,
        hullNumber: String(form.get('hullNumber') ?? '').trim() || undefined
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onConvert = async () => {
    try {
      setError(null);

      const quotationId = await convertEnquiryToQuotationDraft(id);

      if (!quotationId) {
        router.push('/dashboard/quotations?created=1');
        return;
      }

      try {
        const { quotation } = await getQuotationDetail(quotationId);
        const quotationReference = quotation.document_number || quotationId;
        router.push(`/dashboard/quotations/${quotationId}?created=1&reference=${encodeURIComponent(quotationReference)}`);
      } catch {
        router.push(`/dashboard/quotations?created=1&quotationId=${encodeURIComponent(quotationId)}`);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;

  if (!enquiry) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600">{error ?? 'Unable to load enquiry details.'}</p>
        <button type="button" onClick={() => load()} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Enquiry {enquiry.job_number}</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => setRfqOpen(true)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">Generate Supplier RFQ PDF</button>
          <button type="button" onClick={onConvert} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white">Convert to quotation draft</button>
        </div>
      </div>
      {searchParams.get('created') === '1' ? <p className="text-sm font-medium text-emerald-700">Enquiry created successfully: {enquiry.job_number}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p><span className="font-medium">Enquiry Ref:</span> {enquiry.job_number}</p>
        <p><span className="font-medium">Enquiry Date:</span> {formatIsoDate(enquiry.enquiry_date)}</p>
        <p><span className="font-medium">Client:</span> {enquiry.client_name || enquiry.client_id}</p>
        <p><span className="font-medium">PIC:</span> {enquiry.pic_name || '-'}{enquiry.pic_phone ? ` • ${enquiry.pic_phone}` : ''}{enquiry.pic_email ? ` • ${enquiry.pic_email}` : ''}</p>
        <p><span className="font-medium">Job Type:</span> {enquiry.job_type_name || '-'}</p>
        <p><span className="font-medium">Sales PIC:</span> {salesPicOptions.find((user) => user.id === enquiry.sales_pic_user_id)?.full_name || '-'}</p>
        <p><span className="font-medium">Vessel:</span> {enquiry.vessel_name || '-'}</p>
        <p><span className="font-medium">IMO:</span> {enquiry.vessel_imo_number || '-'}</p>
        <p><span className="font-medium">Shipyard:</span> {enquiry.shipyard || '-'}</p>
        <p><span className="font-medium">Hull Number:</span> {enquiry.hull_number || '-'}</p>
        <p><span className="font-medium">FOR:</span> {enquiry.machinery_for || '-'}</p>
        <p><span className="font-medium">MAKE:</span> {enquiry.machinery_make || '-'}</p>
        <p><span className="font-medium">TYPE:</span> {enquiry.machinery_type || '-'}</p>
        <p><span className="font-medium">S. No.:</span> {enquiry.machinery_serial_no || '-'}</p>
      </div>
      <form onSubmit={onSaveMetadata} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <select name="jobTypeId" defaultValue={enquiry.job_type_id || ''} className="rounded border p-2" required>
          <option value="">Select Job Type</option>
          {jobTypeOptions.map((jobType) => (
            <option key={jobType.id} value={jobType.id}>
              {jobType.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">Job Type is required.</p>
        <select name="salesPicUserId" defaultValue={enquiry.sales_pic_user_id || ''} className="rounded border p-2">
          <option value="">Sales PIC (optional)</option>
          {salesPicOptions.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name}{user.email ? ` (${user.email})` : ''}
            </option>
          ))}
        </select>
        <input name="picName" defaultValue={enquiry.pic_name || ''} className="rounded border p-2" placeholder="PIC name" />
        <input name="picPhone" defaultValue={enquiry.pic_phone || ''} className="rounded border p-2" placeholder="PIC phone" />
        <input name="picEmail" type="email" defaultValue={enquiry.pic_email || ''} className="rounded border p-2 md:col-span-2" placeholder="PIC email" />
        <input name="vesselName" defaultValue={enquiry.vessel_name || ''} className="rounded border p-2" placeholder="Vessel name" required />
        <input name="vesselImoNumber" defaultValue={enquiry.vessel_imo_number || ''} className="rounded border p-2" placeholder="IMO (optional)" />
        <input name="shipyard" defaultValue={enquiry.shipyard || ''} className="rounded border p-2" placeholder="Shipyard (optional)" />
        <input name="hullNumber" defaultValue={enquiry.hull_number || ''} className="rounded border p-2" placeholder="Hull number (optional)" />
        <button className="w-fit rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white" type="submit">
          Save enquiry details
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {lines.map((line) => (
          <div key={line.id} className="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
            <p>
              {line.item_serial_no ? `S/No: ${line.item_serial_no} • ` : ''}
              {line.part_no ? `Part No: ${line.part_no} • ` : ''}
              {line.description} • Qty: {line.quantity}
            </p>
            <button
              type="button"
              onClick={() => onDeleteLine(line.id)}
              className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {rfqOpen && enquiry ? <SupplierRfqModal enquiry={enquiry} lines={lines} onClose={() => setRfqOpen(false)} /> : null}
      <form onSubmit={onAddLine} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-6">
        <input name="itemSerialNo" className="rounded border p-2" placeholder="Item serial no" />
        <input name="partNo" className="rounded border p-2" placeholder="Part no" />
        <input name="description" className="rounded border p-2 md:col-span-2" placeholder="Description" required />
        <input name="quantity" type="number" min="0.001" step="0.001" className="rounded border p-2" placeholder="Qty" required />
        <button className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white" type="submit">Add line</button>
        <input type="hidden" name="unitPrice" value="0" />
        <input type="hidden" name="currency" value="AED" />
        <input type="hidden" name="vatRate" value="5" />
      </form>
    </div>
  );
};

export default EnquiryDetailPage;
