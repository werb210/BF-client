/* @vitest-environment jsdom */
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
const { updateMock, navigateMock, persistMock, apiUpdateMock, apiStartMock } = vi.hoisted(() => ({ updateMock: vi.fn(), navigateMock: vi.fn(), persistMock: vi.fn(async()=>undefined), apiUpdateMock: vi.fn(), apiStartMock: vi.fn() }));
vi.mock("react-router-dom", async () => ({ ...(await vi.importActual("react-router-dom")), useNavigate: () => navigateMock }));
vi.mock("../../state/useApplicationStore",()=>({useApplicationStore:()=>({app:{currentStep:4,applicationToken:"t",applicant:{fullName:'a'},business:{},kyc:{}},update:updateMock,autosaveError:null as string | null})}));
vi.mock("../../api/clientApp",()=>({ClientAppAPI:{update:apiUpdateMock,start:apiStartMock}}));
vi.mock("../saveStepProgress",()=>({persistApplicationStep:persistMock}));
vi.mock("../../utils/track",()=>({track:vi.fn()}));
vi.mock("../../components/StepHeader",()=>({StepHeader:():JSX.Element=><div/>}));
vi.mock("../../components/WizardLayout",()=>({WizardLayout:({children}:{children:ReactNode}):JSX.Element=><div>{children}</div>}));
vi.mock("../../components/ui/Card",()=>({Card:({children}:{children:ReactNode}):JSX.Element=><div>{children}</div>}));
vi.mock("../../components/ui/Button",()=>({Button:({children,...props}:any):JSX.Element=><button {...props}>{children}</button>}));
import Step4_Applicant from "../Step4_Applicant";
describe("step4",()=>{let c:HTMLDivElement;let r:Root;beforeEach(()=>{c=document.createElement('div');document.body.appendChild(c);r=createRoot(c);});it("advances step5",async()=>{apiUpdateMock.mockRejectedValueOnce(new Error('Gone'));await act(async()=>{r.render(<Step4_Applicant/>);});const btn=Array.from(c.querySelectorAll('button')).find(b=>/continue/i.test(b.textContent||'')); if(!btn) throw new Error('no'); await act(async()=>{btn.click(); await Promise.resolve();}); expect(navigateMock).toHaveBeenCalledWith('/apply/step-5');});});
// BF_CLIENT_WIZARD_LOCAL_FIRST_v58_STEP4_TEST_ANCHOR
