"use server";

import { createDesign } from "@/actions/design";
import { StageInput } from "@/components/StageInput";

export default function NewDesignPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Create Design Template</h1>
      
      <form action={createDesign} className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-zinc-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Design Name *
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500"
              placeholder="e.g., Hex Bolt M12"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500"
              placeholder="Product description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Target Dimensions
              </label>
              <input
                type="text"
                name="targetDimensions"
                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500"
                placeholder="e.g., 12mm x 50mm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Target Weight (kg)
              </label>
              <input
                type="number"
                name="targetWeight"
                step="0.01"
                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500"
                placeholder="0.05"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Production Stages</h2>
          <p className="text-sm text-zinc-500 mb-4">Define the sequence of production stages</p>
          
          <StageInput />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="px-6 py-2 bg-zinc-900 text-white font-medium rounded-md hover:bg-zinc-800"
          >
            Create Design
          </button>
          <a
            href="/designs"
            className="px-6 py-2 border border-zinc-300 text-zinc-700 font-medium rounded-md hover:bg-zinc-50"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}

function StageInput() {
  const defaultStages = ["Cutting", "Forging", "Threading", "Quality Check"];
  
  return (
    <div className="space-y-3" id="stages-container">
      {defaultStages.map((name, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-8 text-sm font-medium text-zinc-500">{i + 1}</span>
          <input
            type="text"
            name={`stages[${i}].name`}
            defaultValue={name}
            className="flex-1 px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500"
            placeholder="Stage name"
          />
        </div>
      ))}
      <button
        type="button"
        onclick="addStage()"
        className="text-sm text-blue-600 hover:underline"
      >
        + Add Stage
      </button>
    </div>
  );
}