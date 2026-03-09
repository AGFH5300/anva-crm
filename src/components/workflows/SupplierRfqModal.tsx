'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupplierRfqDocumentLog, listSuppliers, uploadSupplierRfqPdf, upsertEnquirySupplierLink } from '@/lib/crmApi';
import type { Enquiry, EnquiryLine, Supplier } from '@/types/crm';
import SupplierQuickAdd from '@/components/workflows/SupplierQuickAdd';
import { DEFAULT_BRANDING } from '@/lib/documentTemplate';

type SupplierRfqModalProps = {
  enquiry: Enquiry;
  lines: EnquiryLine[];
  onClose: () => void;
};

const nextDocNo = () => `ANVA-RFQ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
const importAtRuntime = <T,>(moduleName: string) => (new Function('name', 'return import(name)')(moduleName) as Promise<T>);

const SupplierRfqModal = ({ enquiry, lines, onClose }: SupplierRfqModalProps) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [includeSerialNumber, setIncludeSerialNumber] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>(lines.map((l) => l.id));
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSuppliers().then((data) => setSuppliers(data)).catch((err: Error) => setError(err.message));
  }, []);

  const selectedSupplier = useMemo(() => suppliers.find((supplier) => supplier.id === selectedSupplierId), [suppliers, selectedSupplierId]);
  const includedLines = useMemo(() => lines.filter((line) => selectedLineIds.includes(line.id)), [lines, selectedLineIds]);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => s.company_name.toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q));
  }, [search, suppliers]);

  const toggleLine = (lineId: string) => {
    setSelectedLineIds((prev) => prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId]);
  };

  const generatePdf = async () => {
    if (!selectedSupplier || includedLines.length === 0) {
      setError('Please select a supplier and at least one line item.');
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const documentNumber = nextDocNo();
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        importAtRuntime<{ jsPDF: new (options?: { unit?: string; format?: string }) => {
          setFontSize: (size: number) => void;
          text: (text: string, x: number, y: number) => void;
          output: (type: 'blob') => Blob;
          save: (fileName: string) => void;
        } }>('jspdf'),
        importAtRuntime<{ default?: unknown }>('jspdf-autotable')
      ]);
      const autoTable = (autoTableModule.default || autoTableModule) as (doc: unknown, options: Record<string, unknown>) => void;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });

      doc.setFontSize(14);
      doc.text(DEFAULT_BRANDING.companyName, 40, 46);
      doc.setFontSize(10);
      doc.text(DEFAULT_BRANDING.companyAddress, 40, 62);
      doc.text(`Email: ${DEFAULT_BRANDING.companyEmail} | ${DEFAULT_BRANDING.companyPhone}`, 40, 76);

      doc.setFontSize(16);
      doc.text('SUPPLIER REQUEST FOR QUOTATION (RFQ)', 40, 110);
      doc.setFontSize(10);
      doc.text(`RFQ No: ${documentNumber}`, 40, 128);
      doc.text(`Date: ${new Date().toISOString().slice(0, 10)}`, 40, 142);
      doc.text(`Enquiry Ref: ${enquiry.job_number}`, 40, 156);

      doc.setFontSize(11);
      doc.text(`To: ${selectedSupplier.company_name}`, 40, 182);
      if (selectedSupplier.contact_person) doc.text(`Attention: ${selectedSupplier.contact_person}`, 40, 196);
      const supplierContact = [selectedSupplier.email, selectedSupplier.phone || selectedSupplier.mobile].filter(Boolean).join(' | ');
      if (supplierContact) doc.text(`Contact: ${supplierContact}`, 40, 210);
      const supplierAddress = [selectedSupplier.address_line_1, selectedSupplier.city, selectedSupplier.country].filter(Boolean).join(', ');
      if (supplierAddress) doc.text(`Address: ${supplierAddress}`, 40, 224);

      const head = includeSerialNumber
        ? [['Item', 'Description', 'Qty', 'Part No', 'Serial No']]
        : [['Item', 'Description', 'Qty', 'Part No']];

      const body = includedLines.map((line, index) => includeSerialNumber
        ? [String(index + 1), line.description, String(line.quantity), line.part_no || '-', line.item_serial_no || '-']
        : [String(index + 1), line.description, String(line.quantity), line.part_no || '-']);

      autoTable(doc, {
        startY: 250,
        head,
        body,
        styles: { fontSize: 9, cellPadding: 4 }
      });

      const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 500;
      doc.setFontSize(10);
      doc.text('Please provide your best unit price and earliest delivery for the above items.', 40, finalY + 28);
      doc.text('Regards, Procurement Team', 40, finalY + 44);
      doc.setFontSize(9);
      doc.text(DEFAULT_BRANDING.footerText, 40, Math.min(finalY + 68, 780));

      const blob = doc.output('blob');
      doc.save(`${documentNumber}.pdf`);

      try {
        const filePath = await uploadSupplierRfqPdf({ enquiryId: enquiry.id, supplierId: selectedSupplier.id, documentNumber, blob });

        await upsertEnquirySupplierLink({ enquiryId: enquiry.id, supplier: selectedSupplier, status: 'generated' });
        await createSupplierRfqDocumentLog({
          enquiryId: enquiry.id,
          supplierId: selectedSupplier.id,
          documentNumber,
          includeSerialNumber,
          filePath,
          selectedLineIds,
          notes: 'Generated from enquiry RFQ modal'
        });

        setMessage(`Supplier RFQ generated and logged: ${documentNumber}`);
      } catch {
        setMessage(`Supplier RFQ generated and downloaded: ${documentNumber} (saved locally only)`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Generate Supplier RFQ PDF</h2>
          <button onClick={onClose} type="button" className="rounded border px-2 py-1 text-sm">Close</button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 rounded border p-3">
            <p className="text-sm font-medium">Supplier</p>
            <input className="w-full rounded border p-2 text-sm" placeholder="Search supplier" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="w-full rounded border p-2 text-sm" value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)}>
              <option value="">Select supplier</option>
              {filteredSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.company_name}{supplier.email ? ` (${supplier.email})` : ''}</option>)}
            </select>
            <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => setShowQuickAdd((v) => !v)}>{showQuickAdd ? 'Hide quick-add' : 'Quick add supplier'}</button>
            {showQuickAdd ? <SupplierQuickAdd initialCompanyName={search} onCancel={() => setShowQuickAdd(false)} onCreated={(supplier) => {
              setSuppliers((prev) => [supplier, ...prev]);
              setSelectedSupplierId(supplier.id);
              setShowQuickAdd(false);
            }} /> : null}
          </div>

          <div className="space-y-2 rounded border p-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeSerialNumber} onChange={(e) => setIncludeSerialNumber(e.target.checked)} /> Include serial number column</label>
            <p className="text-xs text-slate-500">Client, vessel, and any end-customer identity are intentionally excluded from RFQ output.</p>
            <button type="button" onClick={generatePdf} disabled={busy} className="rounded bg-primary px-3 py-2 text-sm font-medium text-white">{busy ? 'Generating…' : 'Generate & download PDF'}</button>
          </div>
        </div>

        <div className="mt-3 rounded border p-3">
          <p className="mb-2 text-sm font-medium">Select line items</p>
          <div className="space-y-2">
            {lines.map((line) => (
              <label key={line.id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={selectedLineIds.includes(line.id)} onChange={() => toggleLine(line.id)} />
                <span>{line.description} • Qty: {line.quantity}{line.part_no ? ` • Part No: ${line.part_no}` : ''}{includeSerialNumber && line.item_serial_no ? ` • Serial: ${line.item_serial_no}` : ''}</span>
              </label>
            ))}
          </div>
        </div>

        {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
};

export default SupplierRfqModal;
