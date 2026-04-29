/* @vitest-environment jsdom */
import { describe,it,expect,vi,beforeEach } from "vitest"; import React from "react"; import { createRoot } from "react-dom/client"; import { act } from "react"; import Wizard from "../Wizard";
const navigateSpy=vi.fn(); const updateSpy=vi.fn(); const storeState={currentStep:2,applicationToken:'22222222-2222-4222-8222-222222222222'};
vi.mock('react-router-dom',()=>({useLocation:()=>({pathname:'/apply/step-3'}),useNavigate:()=>navigateSpy}));
vi.mock('@/state/useApplicationStore',()=>({useApplicationStore:()=>({app:storeState,update:(p:any)=>{updateSpy(p);Object.assign(storeState,p);}})}));
vi.mock('@/state/offline',()=>({OfflineStore:{load:()=>({applicationToken:'22222222-2222-4222-8222-222222222222'})}}));
vi.mock('@/wizard/Step1_FinancialProfile',()=>({default:()=> <div data-testid='rendered-step'>STEP 1</div>}));vi.mock('@/wizard/Step2_ProductCategory',()=>({default:()=> <div data-testid='rendered-step'>STEP 2</div>}));vi.mock('@/wizard/Step3_BusinessDetails',()=>({default:()=> <div data-testid='rendered-step'>STEP 3</div>}));vi.mock('@/wizard/Step4_ApplicantInformation',()=>({default:()=> <div data-testid='rendered-step'>STEP 4</div>}));vi.mock('@/wizard/Step5_Documents',()=>({default:()=> <div data-testid='rendered-step'>STEP 5</div>}));vi.mock('@/wizard/Step6_TermsSignature',()=>({default:()=> <div data-testid='rendered-step'>STEP 6</div>}));
describe('url sot',()=>{beforeEach(()=>{updateSpy.mockReset();navigateSpy.mockReset();}); it('renders step 3',async()=>{const d=document.createElement('div');const r=createRoot(d); await act(async()=>{r.render(<Wizard/>)}); expect(d.querySelector('[data-testid="rendered-step"]')?.textContent).toBe('STEP 3');});});
// BF_CLIENT_WIZARD_URL_SOT_v56_WIZARD_TEST_ANCHOR
