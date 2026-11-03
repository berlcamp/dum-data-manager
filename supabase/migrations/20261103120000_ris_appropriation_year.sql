-- Give every RIS appropriation a budget year
--
-- The Appropriation Summary (/ris/appropriation-summary) used to pick
-- appropriations by the year their R.I.S. were requested, so a 2025 4th
-- quarter appropriation spent in January 2026 showed up under 2026. The year
-- now lives on the appropriation itself, is required on the Appropriations
-- page, and drives the summary's Year filter.
--
-- BACKFILL for existing rows, first match wins:
--   1. a year written in the name ("2026 2ND QTR VARIOUS OFFICES" -> 2026,
--      "MMO ADDITIONAL 4TH QTR 2025" -> 2025 even though it was spent in 2026)
--   2. the year of its earliest R.I.S.
--   3. the year of the nearest appropriation by id (unused rows such as
--      "PNP" or "MEO to delete" have neither a name year nor an R.I.S.)
-- Review the result on the Appropriations page and fix any that are off.

begin;

alter table public.ddm_ris_appropriations
  add column if not exists year integer;

-- 1. Year in the name
update public.ddm_ris_appropriations
set year = substring(name from '\m(20[0-9]{2})\M')::int
where year is null
  and name ~ '\m20[0-9]{2}\M';

-- 2. Earliest R.I.S. charged to it
update public.ddm_ris_appropriations a
set year = first_ris.year
from (
  select po.appropriation as appropriation_id,
         min(extract(year from r.date_requested))::int as year
  from public.ddm_ris r
  join public.ddm_ris_purchase_orders po on po.id = r.po_id
  where r.is_deleted = false
    and po.appropriation is not null
  group by po.appropriation
) first_ris
where a.id = first_ris.appropriation_id
  and a.year is null;

-- 3. Nearest appropriation by id that has a year
update public.ddm_ris_appropriations a
set year = (
  select b.year
  from public.ddm_ris_appropriations b
  where b.year is not null
  order by abs(b.id - a.id), b.id
  limit 1
)
where a.year is null;

alter table public.ddm_ris_appropriations
  alter column year set not null,
  add constraint ddm_ris_appropriations_year_check
    check (year between 2000 and 2100);

create index if not exists ddm_ris_appropriations_year_idx
  on public.ddm_ris_appropriations (year);

commit;
