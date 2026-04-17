const { z } = require('zod');

const stageCompletionSchema = z.object({
  department: z.string().optional(),
  kgIn: z.number(),
  kgOut: z.number(),
  kgScrap: z.number(),
}).refine(
  (data) => {
    if (data.department === 'Electroplating') {
      return (Number(data.kgOut) + Number(data.kgScrap)) >= Number(data.kgIn);
    }
    const total = Number(data.kgOut) + Number(data.kgScrap);
    const balance = Math.abs(total - data.kgIn);
    return balance < 0.01;
  },
  { message: "Balance error" }
);

const testCases = [
  { department: 'Electroplating', kgIn: 10, kgOut: 11, kgScrap: 0, expected: true }, // Weight gain
  { department: 'Electroplating', kgIn: 10, kgOut: 9, kgScrap: 2, expected: true },  // Scrap + Gain
  { department: 'Electroplating', kgIn: 10, kgOut: 8, kgScrap: 1, expected: false }, // Loss (invalid for plating)
  { department: 'Cutting', kgIn: 10, kgOut: 9, kgScrap: 1, expected: true },        // Standard
  { department: 'Cutting', kgIn: 10, kgOut: 11, kgScrap: 0, expected: false },      // Standard doesn't gain
];

testCases.forEach((tc, i) => {
  const result = stageCompletionSchema.safeParse(tc);
  if (result.success === tc.expected) {
    console.log(`Test ${i + 1} passed`);
  } else {
    console.error(`Test ${i + 1} FAILED: Expected ${tc.expected}, got ${result.success}`);
    console.error(`Data:`, tc);
    if (!result.success) console.error(`Error:`, result.error.message);
  }
});
