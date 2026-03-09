'use client';

import { useMemo } from 'react';
import { renderDocumentHtml, type RenderCommercialDocument } from '@/lib/documentTemplate';

type Props = {
  document: RenderCommercialDocument;
};

const DocumentPreview = ({ document }: Props) => {
  const html = useMemo(() => renderDocumentHtml(document), [document]);

  return (
    <iframe
      title="Document preview"
      srcDoc={html}
      className="h-[640px] w-full rounded-lg border border-slate-200"
    />
  );
};

export default DocumentPreview;
