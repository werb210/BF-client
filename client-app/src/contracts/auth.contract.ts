import { z } from "zod";

export const AUTH_CONTRACT = {
  OTP_START: "/api/auth/otp/start",
  OTP_VERIFY: "/api/auth/otp/verify"
} as const;

export type AuthEndpoints =
  typeof AUTH_CONTRACT[keyof typeof AUTH_CONTRACT];

const otpVerifyDataSchema = z.object({
  token: z.string(),
  user: z.record(z.unknown()),
  nextPath: z.string().optional(),
}).passthrough();

export const OtpVerify = {
  response: z.object({
    ok: z.literal(true),
    data: otpVerifyDataSchema,
  }),
} as const;
