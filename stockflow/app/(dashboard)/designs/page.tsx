import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DesignsPage() {
  const designs = await prisma.design.findMany({
    include: { stages: { orderBy: { sequence: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Design Templates</h1>
        <Link
          href="/designs/new"
          className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800"
        >
          New Design
        </Link>
      </div>

      {designs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-zinc-200">
          <p className="text-zinc-500">No designs yet. Create your first template.</p>
          <Link href="/designs/new" className="text-blue-600 hover:underline mt-2 inline-block">
            Create Design →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {designs.map((design) => (
            <div
              key={design.id}
              className="bg-white p-6 rounded-lg border border-zinc-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900">{design.name}</h3>
                  {design.description && (
                    <p className="text-sm text-zinc-500 mt-1">{design.description}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    {design.stages.map((stage) => (
                      <span
                        key={stage.id}
                        className="inline-flex items-center px-2 py-1 bg-zinc-100 text-zinc-700 text-xs rounded"
                      >
                        {stage.sequence}. {stage.name}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href={`/designs/${design.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </Link>
              </div>
              <div className="mt-3 text-xs text-zinc-400">
                {design.targetDimensions && <span>Dimensions: {design.targetDimensions} | </span>}
                {design.targetWeight && <span>Target: {design.targetWeight} kg</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}