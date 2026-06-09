-- Add oil_price column to ddm_ris_purchase_orders
-- Supports the "Oil and Lubricants" PO type, which is quantity (liters) based
-- with a single price per liter (mirrors diesel_price / gasoline_price).
ALTER TABLE ddm_ris_purchase_orders
ADD COLUMN IF NOT EXISTS oil_price numeric;
