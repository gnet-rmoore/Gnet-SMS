# Operations & Facilities

**Owns:** `Vehicle`, `VehicleMaintenance`, `WorkOrder`, `WorkOrderEvent`,
`InventoryItem`, `InventoryMovement`, `SecurityLog`, and `Requisition`.

Work orders retain request, impact, target date, safety, access, assignment,
asset-link, and resolution details. Status and assignment changes are written to
`WorkOrderEvent`.

Inventory supports consumable stock movements and individually tracked
equipment assets. Asset tags, serials, condition, custody, warranty, and
purchase details live on `InventoryItem`; receipts, issues, returns,
adjustments, custody changes, and metadata edits are retained in
`InventoryMovement`.

The Ops container pushes its Prisma schema before startup. On rollout, existing
inventory balances and work orders receive explicit baseline events; the system
does not reconstruct activity that was never recorded.

**Notes:** `Requisition` exists in Prisma but does not yet have wired routes.
