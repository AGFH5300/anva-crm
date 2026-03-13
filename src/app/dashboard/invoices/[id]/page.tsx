import InvoiceDetailPage from '@/views/dashboard/InvoiceDetailPage';

export default async function InvoiceDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceDetailPage id={id} />;
}
