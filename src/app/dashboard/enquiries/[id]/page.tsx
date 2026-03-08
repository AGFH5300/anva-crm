import EnquiryDetailPage from '@/views/dashboard/EnquiryDetailPage';

export default function EnquiryDetailRoute({ params }: { params: { id: string } }) {
  return <EnquiryDetailPage id={params.id} />;
}
