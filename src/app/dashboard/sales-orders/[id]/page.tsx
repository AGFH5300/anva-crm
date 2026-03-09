import SalesOrderDetailPage from '@/views/dashboard/SalesOrderDetailPage';

type SalesOrderDetailRouteProps = { params: { id: string } };

export default function SalesOrderDetailRoute({ params }: SalesOrderDetailRouteProps) {
  return <SalesOrderDetailPage id={params.id} />;
}
