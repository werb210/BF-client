// @ts-nocheck
// BF_CLIENT_BLOCK_v156_DOC_SOURCE_OF_TRUTH_v1 — the global "6 Months Bank
// Statements" append was a duplicate of the server's canonical
// "6 months business banking statements" entry returned by
// /api/portal/lender-products/required-docs. Server is the source of truth.
export function buildRequiredDocumentList(matchingProducts: unknown[]) {
  const docs = new Set<string>();
  matchingProducts.forEach((product: any) => {
    (product.requiredDocuments || []).forEach((d: string) => docs.add(d));
  });
  return Array.from(docs);
}
