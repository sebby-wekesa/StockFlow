import { getPackagingQueue } from "@/app/actions/packaging";
import { PackagingQueue } from "@/components/PackagingQueue";

export const dynamic = 'force-dynamic';

export default async function PackagingPage() {
  const orders = await getPackagingQueue();

  return (
    <div className="dashboard-content">
      <h1>Packaging Queue</h1>

      <PackagingQueue orders={orders} />
    </div>
  );
}