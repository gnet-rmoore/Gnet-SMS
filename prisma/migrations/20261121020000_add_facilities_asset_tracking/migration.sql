ALTER TABLE IF EXISTS "public"."WorkOrder"
  ADD COLUMN IF NOT EXISTS "requestType" TEXT NOT NULL DEFAULT 'REPAIR',
  ADD COLUMN IF NOT EXISTS "impact" TEXT NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS "building" TEXT,
  ADD COLUMN IF NOT EXISTS "room" TEXT,
  ADD COLUMN IF NOT EXISTS "dueAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "safetyRelated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "safetyNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "accessNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "estimatedCost" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "resolutionNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "inventoryItemId" TEXT;

ALTER TABLE IF EXISTS "public"."InventoryItem"
  ADD COLUMN IF NOT EXISTS "itemType" TEXT NOT NULL DEFAULT 'CONSUMABLE',
  ADD COLUMN IF NOT EXISTS "sku" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "location" TEXT,
  ADD COLUMN IF NOT EXISTS "supplier" TEXT,
  ADD COLUMN IF NOT EXISTS "unitCost" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "manufacturer" TEXT,
  ADD COLUMN IF NOT EXISTS "model" TEXT,
  ADD COLUMN IF NOT EXISTS "serialNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "assetTag" TEXT,
  ADD COLUMN IF NOT EXISTS "condition" TEXT,
  ADD COLUMN IF NOT EXISTS "assetStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "assignedTo" TEXT,
  ADD COLUMN IF NOT EXISTS "purchaseDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "warrantyExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE TABLE IF NOT EXISTS "public"."InventoryMovement" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "baselineItemId" TEXT,
  "schoolId" TEXT NOT NULL,
  "movementType" TEXT NOT NULL,
  "quantityDelta" INTEGER NOT NULL DEFAULT 0,
  "quantityBefore" INTEGER NOT NULL,
  "quantityAfter" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "reference" TEXT,
  "previousCondition" TEXT,
  "newCondition" TEXT,
  "previousAssetStatus" TEXT,
  "newAssetStatus" TEXT,
  "previousAssignedTo" TEXT,
  "newAssignedTo" TEXT,
  "movementUnitCost" DOUBLE PRECISION,
  "details" JSONB,
  "performedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryMovement_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "public"."InventoryItem"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."WorkOrderEvent" (
  "id" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "baselineWorkOrderId" TEXT,
  "actorId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkOrderEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkOrderEvent_workOrderId_fkey"
    FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkOrder_inventoryItemId_fkey'
  ) THEN
    ALTER TABLE "public"."WorkOrder"
      ADD CONSTRAINT "WorkOrder_inventoryItemId_fkey"
      FOREIGN KEY ("inventoryItemId") REFERENCES "public"."InventoryItem"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_schoolId_sku_key"
  ON "public"."InventoryItem"("schoolId", "sku");
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_schoolId_serialNumber_key"
  ON "public"."InventoryItem"("schoolId", "serialNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_schoolId_assetTag_key"
  ON "public"."InventoryItem"("schoolId", "assetTag");
CREATE INDEX IF NOT EXISTS "InventoryItem_schoolId_itemType_category_idx"
  ON "public"."InventoryItem"("schoolId", "itemType", "category");
CREATE INDEX IF NOT EXISTS "InventoryItem_schoolId_quantity_minQuantity_idx"
  ON "public"."InventoryItem"("schoolId", "quantity", "minQuantity");
CREATE INDEX IF NOT EXISTS "WorkOrder_schoolId_status_createdAt_idx"
  ON "public"."WorkOrder"("schoolId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "WorkOrder_schoolId_dueAt_idx"
  ON "public"."WorkOrder"("schoolId", "dueAt");
CREATE INDEX IF NOT EXISTS "WorkOrder_inventoryItemId_idx"
  ON "public"."WorkOrder"("inventoryItemId");
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryMovement_baselineItemId_key"
  ON "public"."InventoryMovement"("baselineItemId");
CREATE INDEX IF NOT EXISTS "InventoryMovement_schoolId_itemId_createdAt_idx"
  ON "public"."InventoryMovement"("schoolId", "itemId", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryMovement_schoolId_movementType_createdAt_idx"
  ON "public"."InventoryMovement"("schoolId", "movementType", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkOrderEvent_baselineWorkOrderId_key"
  ON "public"."WorkOrderEvent"("baselineWorkOrderId");
CREATE INDEX IF NOT EXISTS "WorkOrderEvent_workOrderId_createdAt_idx"
  ON "public"."WorkOrderEvent"("workOrderId", "createdAt");

INSERT INTO "public"."InventoryMovement" (
  "id", "itemId", "baselineItemId", "schoolId", "movementType",
  "quantityDelta", "quantityBefore", "quantityAfter", "reason",
  "movementUnitCost", "newCondition", "newAssetStatus", "newAssignedTo",
  "performedBy", "createdAt"
)
SELECT
  gen_random_uuid()::text, i."id", i."id", i."schoolId", 'MIGRATION_BASELINE',
  i."quantity", 0, i."quantity",
  'Opening balance at audit rollout; earlier movement history is unavailable.',
  i."unitCost", i."condition", i."assetStatus", i."assignedTo",
  'SYSTEM_MIGRATION', CURRENT_TIMESTAMP
FROM "public"."InventoryItem" AS i
ON CONFLICT ("baselineItemId") DO NOTHING;

INSERT INTO "public"."WorkOrderEvent" (
  "id", "workOrderId", "baselineWorkOrderId", "actorId", "eventType",
  "summary", "newValue", "createdAt"
)
SELECT
  gen_random_uuid()::text, w."id", w."id", w."requestedBy", 'MIGRATION_BASELINE',
  'Existing work order; earlier activity is unavailable.',
  jsonb_build_object(
    'status', w."status",
    'priority', w."priority",
    'assignedTo', w."assignedTo",
    'dueAt', w."dueAt"
  )::text,
  w."createdAt"
FROM "public"."WorkOrder" AS w
ON CONFLICT ("baselineWorkOrderId") DO NOTHING;
