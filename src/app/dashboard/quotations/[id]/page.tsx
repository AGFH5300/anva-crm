import QuotationDetailPage from '@/views/dashboard/QuotationDetailPage';

export default function QuotationDetailRoute({ params }: { params: { id: string } }) {
  return <QuotationDetailPage id={params.id} />;
}
