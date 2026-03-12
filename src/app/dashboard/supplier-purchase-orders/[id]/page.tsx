import SupplierPurchaseOrderDetailPage from '@/views/dashboard/SupplierPurchaseOrderDetailPage';

type SupplierPurchaseOrderDetailRouteProps = { params: { id: string } };

export default function SupplierPurchaseOrderDetailRoute({ params }: SupplierPurchaseOrderDetailRouteProps) {
  return <SupplierPurchaseOrderDetailPage id={params.id} />;
}
