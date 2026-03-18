import { startOtp as startOtpAuth } from "./auth";

export const startOtp = (phone: string) => startOtpAuth(phone);
