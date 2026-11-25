import { maintenanceApi } from "../src/features/maintenance/api.ts";
import { fetchAllWorkOrders } from "../src/features/maintenance/hooks/useMaintenanceQuery.ts";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    failures++;
  } else {
    console.log(`PASSED: ${message}`);
  }
}

const originalFetchWorkOrders = maintenanceApi.fetchWorkOrders;
const requestedPages: number[] = [];

maintenanceApi.fetchWorkOrders = async (_schoolId, page = 1, pageSize = 100) => {
  requestedPages.push(page);
  assert(pageSize === 100, "uses the supported work-order page size");
  const total = 205;
  const start = (page - 1) * pageSize;
  const count = Math.min(pageSize, total - start);
  return {
    items: Array.from({ length: count }, (_, index) => ({
      id: `work-order-${start + index}`,
    })),
    total,
    page,
    pageSize,
  };
};

try {
  const orders = await fetchAllWorkOrders("school-1");
  assert(orders.length === 205, "loads every page of work orders");
  assert(requestedPages.join(",") === "1,2,3", "requests consecutive pages");
} catch (error) {
  console.error("FAILED: paginated work-order load", error);
  failures++;
} finally {
  maintenanceApi.fetchWorkOrders = originalFetchWorkOrders;
}

if (failures > 0) process.exit(1);
console.log("Facilities query tests passed.");
