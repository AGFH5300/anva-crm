'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getCompanyDocumentSettings, updateCompanyDocumentSettings } from '@/lib/crmApi';
import type { CompanyDocumentSettings } from '@/types/crm';

const SettingsPage = () => {
  const [settings, setSettings] = useState<CompanyDocumentSettings | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCompanyDocumentSettings().then(setSettings).catch((err: Error) => setError(err.message));
  }, []);

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings) return;
    try {
      setError(null);
      const saved = await updateCompanyDocumentSettings(settings);
      setSettings(saved);
      setMessage('Document branding settings saved.');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage shared ANVA branding defaults used by quotations and future document templates.</p>
      </div>

      <form onSubmit={onSave} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <h2 className="text-lg font-semibold text-slate-900 md:col-span-2">Document Settings</h2>
        <label className="space-y-1 text-sm"><span>Company name</span><input className="w-full rounded border p-2" value={settings?.company_name ?? ''} onChange={(e) => setSettings((prev) => prev ? ({ ...prev, company_name: e.target.value }) : prev)} /></label>
        <label className="space-y-1 text-sm"><span>Company TRN</span><input className="w-full rounded border p-2" value={settings?.company_trn ?? ''} onChange={(e) => setSettings((prev) => prev ? ({ ...prev, company_trn: e.target.value }) : prev)} /></label>
        <label className="space-y-1 text-sm"><span>Default payment terms</span><input className="w-full rounded border p-2" value={settings?.default_payment_terms ?? ''} onChange={(e) => setSettings((prev) => prev ? ({ ...prev, default_payment_terms: e.target.value }) : prev)} /></label>
        <label className="space-y-1 text-sm"><span>Default delivery terms</span><input className="w-full rounded border p-2" value={settings?.default_delivery_terms ?? ''} onChange={(e) => setSettings((prev) => prev ? ({ ...prev, default_delivery_terms: e.target.value }) : prev)} /></label>
        <label className="space-y-1 text-sm"><span>Default validity</span><input className="w-full rounded border p-2" value={settings?.default_validity ?? ''} onChange={(e) => setSettings((prev) => prev ? ({ ...prev, default_validity: e.target.value }) : prev)} /></label>
        <label className="space-y-1 text-sm"><span>Default footer text</span><input className="w-full rounded border p-2" value={settings?.default_footer_text ?? ''} onChange={(e) => setSettings((prev) => prev ? ({ ...prev, default_footer_text: e.target.value }) : prev)} /></label>
        <label className="space-y-1 text-sm md:col-span-2"><span>Default terms and conditions</span><textarea className="min-h-24 w-full rounded border p-2" value={settings?.default_terms_and_conditions ?? ''} onChange={(e) => setSettings((prev) => prev ? ({ ...prev, default_terms_and_conditions: e.target.value }) : prev)} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings?.default_letterhead_enabled ?? true} onChange={(e) => setSettings((prev) => prev ? ({ ...prev, default_letterhead_enabled: e.target.checked }) : prev)} /> Default letterhead enabled</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings?.default_stamp_enabled ?? true} onChange={(e) => setSettings((prev) => prev ? ({ ...prev, default_stamp_enabled: e.target.checked }) : prev)} /> Default stamp enabled</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings?.default_signature_enabled ?? true} onChange={(e) => setSettings((prev) => prev ? ({ ...prev, default_signature_enabled: e.target.checked }) : prev)} /> Default signature enabled</label>
        <div className="md:col-span-2">
          <button type="submit" className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white">Save document settings</button>
        </div>
      </form>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
};

export default SettingsPage;
