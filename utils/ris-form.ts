import { z } from 'zod'

// Shared by the two forms that create an R.I.S.: the public fuel request portal
// (components/FuelRequest.tsx) and the admin modal (app/(ris)/ris/AddEditModal).
//
// The number input hands the value over as a string, and an existing R.I.S.
// loaded for editing hands it over as a number, so both are accepted here and
// the result is normalised to a number.
//
// This deliberately avoids `z.preprocess`. Inside a z.object, a preprocess step
// silently drops its own issue whenever another key in the same object has
// already failed — so on a form submitted with several fields blank, the
// Starting Balance error never reached the user and the field looked optional.
// A superRefine always runs and always reports, on every zod version.
export const startingBalanceSchema = (required: boolean) =>
  z
    .union([z.string(), z.number(), z.undefined(), z.null()])
    .superRefine((value, ctx) => {
      const raw = typeof value === 'string' ? value.trim() : value

      if (raw === '' || raw === null || typeof raw === 'undefined') {
        if (required) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Starting Balance (L) is required.',
          })
        }
        return
      }

      const parsed = Number(raw)

      // An empty tank is a real reading, so 0 is allowed — only a missing or
      // nonsensical figure is rejected.
      if (!Number.isFinite(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Starting Balance must be a number.',
        })
      } else if (parsed < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Starting Balance must be greater than or equal to 0.',
        })
      }
    })
    .transform((value) => {
      const raw = typeof value === 'string' ? value.trim() : value
      return raw === '' || raw === null || typeof raw === 'undefined'
        ? undefined
        : Number(raw)
    })
