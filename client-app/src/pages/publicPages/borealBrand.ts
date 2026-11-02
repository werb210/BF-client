// BF_CLIENT_v869_SETTINGS_PACK - Boreal's look on the public booking, survey and privacy pages (Keystone reads this
// per licensee; Boreal is one company). Navy on white: readable at every size.
export type PublicBrand = { company_name: string; primary_color: string; logo_url: string | null };

export const BOREAL_BRAND: PublicBrand = { company_name: "Boreal Financial", primary_color: "#1E3A8A", logo_url: "/logo.svg" };

export function useBrand(): PublicBrand {
  return BOREAL_BRAND;
}
