-- Not everything booked through the reservation module is a vehicle: tents,
-- venues and the sound system go through the same screens. `type` becomes a
-- category with exactly four values.
--
-- The six venue-specific values ('DOA BIG HALL', 'GYM', ...) collapse into
-- 'Venue' without losing anything: each of those rows already repeats the venue
-- in `name` (type 'DOA BIG HALL' / name 'DOA BIG HALL'). The one unit named
-- SOUND SYSTEM was filed under 'Vehicle' and moves to its own category.

ALTER TABLE public.ddm_reservation_vehicles
DROP CONSTRAINT IF EXISTS ddm_reservation_vehicles_type_check;

-- Order matters: this row is still typed 'Vehicle', so it has to be claimed
-- before the catch-alls below run.
UPDATE public.ddm_reservation_vehicles
SET type = 'Sound System'
WHERE name ILIKE 'sound system%';

UPDATE public.ddm_reservation_vehicles
SET type = 'Tents'
WHERE type ILIKE 'tent' OR type ILIKE 'tents';

UPDATE public.ddm_reservation_vehicles
SET type = 'Vehicle'
WHERE type IS NULL OR btrim(type) = '' OR type ILIKE 'vehicle';

-- Whatever is left was a venue-specific label.
UPDATE public.ddm_reservation_vehicles
SET type = 'Venue'
WHERE type NOT IN ('Vehicle', 'Tents', 'Venue', 'Sound System');

ALTER TABLE public.ddm_reservation_vehicles
ALTER COLUMN type SET DEFAULT 'Vehicle';

ALTER TABLE public.ddm_reservation_vehicles
ALTER COLUMN type SET NOT NULL;

ALTER TABLE public.ddm_reservation_vehicles
ADD CONSTRAINT ddm_reservation_vehicles_type_check
CHECK (type IN ('Vehicle', 'Tents', 'Venue', 'Sound System'));
