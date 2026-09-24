// BF_CLIENT_BLOCK_v470_CATEGORY_INFO
// Plain-language description of each product category for Step 2's "What is
// this?" pop-up and the Compare table. Figures are typical market ranges, not
// quotes - actual terms depend on the lender and the business.
import type { BucketId } from "./categoryAliases";

export type CategoryInfo = {
  what: string;
  usedFor: string;
  terms: string;
  bestFor: string;
  notBestAt: string;
};

export const CATEGORY_INFO_FIELDS: Array<{ key: keyof CategoryInfo; label: string }> = [
  { key: "what", label: "What it is" },
  { key: "usedFor", label: "What it is usually used for" },
  { key: "terms", label: "Terms and interest" },
  { key: "bestFor", label: "Best used for" },
  { key: "notBestAt", label: "Not the best choice for" },
];

export const CATEGORY_INFO: Record<BucketId, CategoryInfo> = {
  LINE_OF_CREDIT: {
    what: "A revolving limit you can draw on, repay, and draw on again, like a business credit card with a lower rate.",
    usedFor: "Day-to-day working capital, payroll, inventory top-ups and covering gaps between paying suppliers and getting paid.",
    terms: "Usually reviewed or renewed every 12 months. You pay interest only on what you use. Typically from about prime + 1% at banks to 15-30% a year with alternative lenders.",
    bestFor: "Uneven or seasonal cash flow, where you need money on hand for short periods and repay it quickly.",
    notBestAt: "Large one-time purchases paid back over several years; a term loan or equipment financing is usually cheaper for that.",
  },
  TERM_LOAN: {
    what: "A lump sum paid out once and repaid in fixed, regular payments over a set term.",
    usedFor: "Expansion, renovations, buying a business, refinancing expensive debt, or other one-time investments.",
    terms: "Typically 1 to 10 years. Rates range from about 7% to 30% a year depending on credit, time in business and security.",
    bestFor: "A known amount for a specific purpose, with predictable payments you can budget for.",
    notBestAt: "Ongoing or unpredictable needs, since you pay interest on the full amount from day one.",
  },
  EQUIPMENT_FINANCE: {
    what: "A loan or lease that pays for equipment, with the equipment itself as the security.",
    usedFor: "Vehicles, trucks, machinery, technology and other equipment that keeps its value.",
    terms: "Typically 2 to 7 years, often up to 100% of the cost. Rates are usually about 6% to 20% a year.",
    bestFor: "Buying equipment without tying up cash or other credit lines.",
    notBestAt: "Working capital, soft costs or anything that is not a physical asset the lender can register.",
  },
  FACTORING: {
    what: "You sell your unpaid customer invoices to a lender, who advances most of their value now and collects from your customer.",
    usedFor: "Turning slow-paying invoices into cash within a day or two.",
    terms: "Usually 80% to 95% of the invoice paid up front. Fees are typically 1% to 5% for each 30 days the invoice is outstanding.",
    bestFor: "Businesses that invoice other businesses on 30-90 day terms and need cash sooner, even with limited credit history.",
    notBestAt: "Businesses that sell to consumers or have few invoices, or where customers should not know a lender is involved.",
  },
  PURCHASE_ORDER_FINANCE: {
    what: "Funding that pays your supplier so you can fill a confirmed customer order you could not otherwise afford to fill.",
    usedFor: "Large or unexpected orders for physical goods, especially from creditworthy customers.",
    terms: "Short term - repaid when your customer pays, usually within 30 to 120 days. Fees are typically 1.5% to 6% a month.",
    bestFor: "Taking on a big order without turning it down for lack of cash.",
    notBestAt: "Services businesses, ongoing working capital, or orders with thin profit margins.",
  },
  MERCHANT_CASH_ADVANCE: {
    what: "An advance repaid from a share of your future sales, usually taken daily or weekly from your deposits or card sales.",
    usedFor: "Fast cash for short-term needs, often when bank financing is not available.",
    terms: "Usually 3 to 18 months. Priced with a factor rate (typically 1.1 to 1.5), which can be very expensive when expressed as an annual rate.",
    bestFor: "Businesses with strong daily sales that need money within days and can repay quickly.",
    notBestAt: "Long-term needs or low-margin businesses; the cost is high and frequent repayments strain cash flow.",
  },
  MEDIA: {
    what: "Financing for film, TV and digital media production, secured against tax credits, pre-sales or distribution agreements.",
    usedFor: "Bridging production costs until tax credits, broadcaster licence fees or distribution revenue are received.",
    terms: "Tied to the production schedule and when the receivables are paid, usually 6 to 24 months. Rates and fees depend on the security.",
    bestFor: "Productions with confirmed tax credits or signed distribution and broadcast contracts.",
    notBestAt: "Projects without committed revenue or tax credits, or general business needs outside a production.",
  },
  ASSET_BASED_LENDING: {
    what: "A revolving facility where the amount you can borrow is tied to the value of your receivables, inventory and equipment.",
    usedFor: "Larger working capital needs, growth, acquisitions or turnarounds.",
    terms: "Revolving, often 1 to 3 years. Typically about prime + 2% to 8% a year plus monitoring fees, with regular reporting.",
    bestFor: "Businesses with significant receivables or inventory that need more room than a bank line allows.",
    notBestAt: "Small businesses with few assets, or owners who do not want monthly reporting on receivables and inventory.",
  },
  SBA_GOVERNMENT: {
    what: "Loans partly guaranteed by government - the SBA in the U.S. or programs such as the Canada Small Business Financing Program.",
    usedFor: "Buying or starting a business, real estate, equipment, and long-term working capital.",
    terms: "Longer terms, often 10 to 25 years, with some of the lowest rates available. Approval is slower and needs more paperwork.",
    bestFor: "Established or well-prepared businesses that can wait for approval and want low, long-term payments.",
    notBestAt: "Urgent needs; approval can take weeks, and a personal guarantee is usually required.",
  },
  STARTUP_CAPITAL: {
    what: "Financing for businesses that are new or have been operating for a short time.",
    usedFor: "Opening costs, first inventory, equipment and early working capital.",
    terms: "Usually smaller amounts, relying mainly on the owners' credit and a personal guarantee. Rates are typically higher than for established businesses.",
    bestFor: "New businesses with a solid plan and owners with good personal credit.",
    notBestAt: "Large amounts, or owners with weak personal credit and no collateral.",
  },
};

export const MAX_COMPARE = 4;
