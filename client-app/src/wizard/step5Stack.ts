// BF_CLIENT_v863_STEP5_STACK - below 700px (a phone, or the demo's phone frame) the three Step 5 options become one
// column: each button full width (up to 420px) with "OR" centred on its own line between them. A container query
// makes the demo phone frame count as a phone; the media query is the fallback for older browsers.
const PHONE_RULES = `
    .step5-options-row { flex-direction: column !important; align-items: center !important; }
    .step5-options-row > button { flex: 0 0 auto !important; width: 100% !important; max-width: 420px !important; }
    .step5-or { width: 100%; padding: 2px 0 !important; }
`;
export const STEP5_STACK_BREAKPOINT_PX = 700;
export const STEP5_STACK_CSS = `
  .step5-options-wrap { container-type: inline-size; width: 100%; }
  @container (max-width: ${STEP5_STACK_BREAKPOINT_PX}px) {${PHONE_RULES}}
  @media (max-width: ${STEP5_STACK_BREAKPOINT_PX}px) {${PHONE_RULES}}
`;
