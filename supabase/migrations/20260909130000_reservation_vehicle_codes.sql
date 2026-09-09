-- Every reservation unit gets a short, system-generated 4-character code.
-- The code is what people type into the public schedule portal, so it is
-- generated from an unambiguous alphabet (no I/L/O/0/1) and kept unique.

CREATE OR REPLACE FUNCTION public.generate_reservation_vehicle_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  alphabet CONSTANT text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  attempt int;
  i int;
BEGIN
  FOR attempt IN 1..200 LOOP
    candidate := '';
    FOR i IN 1..4 LOOP
      candidate := candidate
        || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;

    PERFORM 1
    FROM public.ddm_reservation_vehicles
    WHERE upper(code) = candidate;

    IF NOT FOUND THEN
      RETURN candidate;
    END IF;
  END LOOP;

  RAISE EXCEPTION 'Could not generate a unique reservation unit code';
END;
$$;

ALTER TABLE public.ddm_reservation_vehicles
ADD COLUMN IF NOT EXISTS code text;

-- Backfill one row at a time so each generated code sees the ones before it.
DO $$
DECLARE
  unit record;
BEGIN
  FOR unit IN
    SELECT id FROM public.ddm_reservation_vehicles WHERE code IS NULL
  LOOP
    UPDATE public.ddm_reservation_vehicles
    SET code = public.generate_reservation_vehicle_code()
    WHERE id = unit.id;
  END LOOP;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ddm_reservation_vehicles_code_key
ON public.ddm_reservation_vehicles (upper(code));

ALTER TABLE public.ddm_reservation_vehicles
ALTER COLUMN code SET DEFAULT public.generate_reservation_vehicle_code();

ALTER TABLE public.ddm_reservation_vehicles
ALTER COLUMN code SET NOT NULL;

-- The default only covers inserts that omit the column; the trigger also
-- catches inserts that pass an explicit NULL.
CREATE OR REPLACE FUNCTION public.set_reservation_vehicle_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.code IS NULL OR btrim(NEW.code) = '' THEN
    NEW.code := public.generate_reservation_vehicle_code();
  ELSE
    NEW.code := upper(btrim(NEW.code));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ddm_reservation_vehicles_set_code
ON public.ddm_reservation_vehicles;

CREATE TRIGGER ddm_reservation_vehicles_set_code
BEFORE INSERT OR UPDATE ON public.ddm_reservation_vehicles
FOR EACH ROW
EXECUTE FUNCTION public.set_reservation_vehicle_code();
