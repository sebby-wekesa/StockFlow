clconst { processStockArrivals, generateInventoryCSV } = require('../lib/inventory');

const rawData = [
  "1000 M12 Washers (IMP)",
  "50 Wheel Hubs (Local)",
  "500 U-Bolts (Sarazo)",
  "12 Jua Kali Brackets (LOCAL) - BUNJE",
  "200kg Wire Rod (SRZ)",
  "250 Long Nuts (IMPORTED)"
];

console.log("--- Processing Stock Arrivals ---");
const processed = processStockArrivals(rawData);
console.table(processed);

console.log("\n--- Generated CSV Output ---");
console.log(generateInventoryCSV(processed));
