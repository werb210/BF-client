/* @vitest-environment jsdom */
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
const { updateMock, navigateMock, persistMock, apiUpdateMock } = vi.hoisted(() => ({ updateMock: vi.fn(), navigateMock: vi.fn(), persistMock: vi.fn(async()=>undefined), apiUpdateMock: vi.fn() }));
vi.mock("react-router-dom", async () => ({ ...(await vi.importActual("react-router-dom")), useNavigate: () => navigateMock }));
vi.mock("../../state/useApplicationStore",()=>({useApplicationStore:()=>({app:{currentStep:3,applicationToken:"t",business:{companyName:"x"},kyc:{}},update:updateMock,autosaveError:null as string | null})}));
vi.mock("../../api/clientApp",()=>({ClientAppAPI:{update:apiUpdateMock,start:vi.fn()}}));
vi.mock("../saveStepProgress",()=>({persistApplicationStep:persistMock}));
vi.mock("../../utils/track",()=>({track:vi.fn()}));
vi.mock("../../components/StepHeader",()=>({StepHeader:():JSX.Element=><div/>}));
vi.mock("../../components/WizardLayout",()=>({WizardLayout:({children}:{children:ReactNode}):JSX.Element=><div>{children}</div>}));
vi.mock("../../components/ui/Card",()=>({Card:({children}:{children:ReactNode}):JSX.Element=><div>{children}</div>}));
vi.mock("../../components/ui/Button",()=>({Button:({children,...props}:any):JSX.Element=><button {...props}>{children}</button>}));
import Step3_Business from "../Step3_Business";
describe("step3",()=>{let c:HTMLDivElement;let r:Root;beforeEach(()=>{c=document.createElement('div');document.body.appendChild(c);r=createRoot(c);});it("advances",async()=>{apiUpdateMock.mockRejectedValueOnce(new Error('Gone'));await act(async()=>{r.render(<Step3_Business/>);});const btn=Array.from(c.querySelectorAll('button')).find(b=>/continue/i.test(b.textContent||'')); if(!btn) throw new Error('no'); await act(async()=>{btn.click(); await Promise.resolve();}); expect(navigateMock).toHaveBeenCalledWith('/apply/step-4');});});
// BF_CLIENT_WIZARD_LOCAL_FIRST_v58_STEP3_TEST_ANCHOR
