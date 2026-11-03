import { z } from 'zod'
import { RIS_DECIMALS, roundRisAmount } from '@/utils/ris-helper'

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

// Quantity (L) is limited to RIS_DECIMALS places. Reports print liters rounded
// to 2 places while the Amount uses the full quantity, so a back-calculated
// figure like 500 / 82 = 6.0975609... L printed as 6.10 L x 82 = 500.20, not
// the 500.00 actually charged, and department summaries stopped reconciling.
//
// `allowed` lets an edit keep the quantity a record already has — a few older
// records were saved before this rule and must stay editable (status, purpose)
// without forcing their liters to change.
export const hasRisDecimals = (n: number) =>
  Math.abs(roundRisAmount(n) - n) < 1e-9

export const risQuantitySchema = (allowed?: number | null) =>
  z.coerce // use coerce to cast to string to number https://stackoverflow.com/questions/76878664/react-hook-form-and-zod-inumber-input
    .number({
      required_error: 'Quantity (L) is required.',
      invalid_type_error: 'Quantity (L) is required..',
    })
    .gte(1, {
      message: 'Quantity (L) is required...',
    })
    .refine(
      (n) =>
        hasRisDecimals(n) ||
        (allowed !== null &&
          typeof allowed !== 'undefined' &&
          n === Number(allowed)),
      {
        message: `Quantity (L) can have at most ${RIS_DECIMALS} decimal places.`,
      },
    )
