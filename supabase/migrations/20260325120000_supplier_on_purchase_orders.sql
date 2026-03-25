-- Supplier belongs on the Purchase Order (Gas Slip reads it via RIS → PO)
ALTER TABLE ddm_ris DROP COLUMN IF EXISTS supplier;

ALTER TABLE ddm_ris_purchase_orders
  ADD COLUMN IF NOT EXISTS supplier text;
