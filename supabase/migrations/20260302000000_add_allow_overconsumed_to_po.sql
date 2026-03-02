-- Add allow_overconsumed column to ddm_ris_purchase_orders
-- When true, over-consumed POs remain selectable when creating/editing RIS records
ALTER TABLE ddm_ris_purchase_orders
ADD COLUMN IF NOT EXISTS allow_overconsumed boolean DEFAULT false;
