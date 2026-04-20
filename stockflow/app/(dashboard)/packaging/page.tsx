import { getPackagingQueue } from "@/app/actions/packaging";
import { PackagingQueue } from "@/components/PackagingQueue";

export default async function PackagingPage() {
  const orders = await getPackagingQueue();

  return (
    <div>
      <div className="section-header mb-16">
        <div>
          <div className="section-title">Packaging Queue</div>
          <div className="section-sub">Fulfill confirmed sales orders and mark as shipped</div>
        </div>
      </div>
      <PackagingQueue orders={orders} />
    </div>
  );
}