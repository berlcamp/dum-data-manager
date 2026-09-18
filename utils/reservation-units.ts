import {
  reservationUnitCategories,
  type ReservationUnitCategory,
} from '@/constants/TrackerConstants'

interface CategorisableUnit {
  name?: string | null
  type?: string | null
}

// Units used to carry a free-form `type`: 'Tent', 'DOA BIG HALL', 'GYM' and so
// on, with the sound system filed under 'Vehicle'. The categories migration
// rewrites those, but every screen reads the category through here so it is
// also correct before that migration is applied — and for any row that is
// created outside the app.
export const categoryOf = (
  unit: CategorisableUnit,
): ReservationUnitCategory => {
  const type = (unit.type ?? '').trim()
  const name = (unit.name ?? '').trim()

  // Checked first: pre-migration this row's type is still the canonical
  // 'Vehicle', so matching on type alone would file it under Vehicle.
  if (/^sound\s*system\b/i.test(name)) return 'Sound System'

  if ((reservationUnitCategories as readonly string[]).includes(type)) {
    return type as ReservationUnitCategory
  }

  if (/^tents?$/i.test(type)) return 'Tents'
  if (type === '' || /^vehicles?$/i.test(type)) return 'Vehicle'

  // Everything else was a venue-specific label.
  return 'Venue'
}

// Units in category order, keeping each category's own ordering. Categories
// with no units are dropped so empty headers never render.
export const groupUnitsByCategory = <T extends CategorisableUnit>(units: T[]) =>
  reservationUnitCategories
    .map((category) => ({
      category,
      units: units.filter((unit) => categoryOf(unit) === category),
    }))
    .filter((group) => group.units.length > 0)
