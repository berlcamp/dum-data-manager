-- Make RIS quantity, price and total_amount exact decimals
--
-- THE BUG
-- 188.956 L x 92.00 = 17,383.952 was stored as 17,384, so the RIS list, gas
-- slip, and the summary-by-vehicle / summary-by-department reports all lost
-- centavos.
--
-- THE CAUSE
-- `total_amount` is a stored generated column whose expression multiplied in
-- float4 and cast the RESULT to numeric. A float4 -> numeric cast keeps only 6
-- significant digits, so 17383.952 collapsed to 17384. This is not a "rounds to
-- whole pesos" bug -- the loss scales with magnitude, so ₱246.00 was fine while
-- ₱3,499.9976 was stored as 3500 and ₱17,383.952 as 17384.
-- (Verified: `(quantity * price)::numeric` reproduces every value currently in
-- the table.)
--
-- THE FIX
-- Store quantity and price as exact decimals so the product is exact too, then
-- round only the final amount to the 4 decimal places the app displays.
--
-- NOTES ON THE STEPS BELOW
-- 1. total_amount must be dropped FIRST: Postgres refuses to alter the type of
--    a column a generated column depends on ("cannot alter type of a column
--    used by a generated column").
-- 2. The USING clause goes through ::text on purpose. A direct ::numeric cast
--    keeps only 6 significant digits and would silently rewrite existing
--    values (1234.5677 -> 1234.57). Casting via text uses the same
--    shortest-round-trip representation PostgREST already sends to the app, so
--    every stored quantity and price survives unchanged.
-- 3. quantity and price are unconstrained `numeric`, NOT numeric(_,4): 43 rows
--    currently hold 5-decimal quantities (e.g. 2.72778) that a fixed scale of 4
--    would silently round.
-- 4. This rewrites the table under an ACCESS EXCLUSIVE lock. At ~15.4k rows
--    that is sub-second.
-- 5. No application code changes are required. PostgREST already serialises
--    numeric as an unquoted JSON number (starting_balance and total_amount are
--    numeric today), so the JSON the app parses is unchanged.

begin;

alter table public.ddm_ris
  drop column total_amount;

alter table public.ddm_ris
  alter column quantity type numeric using quantity::text::numeric,
  alter column price    type numeric using price::text::numeric;

alter table public.ddm_ris
  add column total_amount numeric(18, 4)
    generated always as (
      round(coalesce(quantity, 0) * coalesce(price, 0), 4)
    ) stored;

-- Let PostgREST pick up the new column definitions
notify pgrst, 'reload schema';

commit;

-- Sanity check -- the row from the original bug report should now read
-- 188.956 | 92.0000 | 17383.9520
select id, quantity, price, total_amount
from public.ddm_ris
where id = 15524;
