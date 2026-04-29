import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApplicationStore } from "@/state/useApplicationStore";
import { OfflineStore } from "@/state/offline";
import Step1 from "@/wizard/Step1_FinancialProfile";
import Step2 from "@/wizard/Step2_ProductCategory";
import Step3 from "@/wizard/Step3_BusinessDetails";
import Step4 from "@/wizard/Step4_ApplicantInformation";
import Step5 from "@/wizard/Step5_Documents";
import Step6 from "@/wizard/Step6_TermsSignature";
const STEP_COMPONENTS=[Step1,Step2,Step3,Step4,Step5,Step6]; const STEP_PATTERN=/\/apply\/step-(\d+)\b/i;
const clampStep=(n:number)=>!Number.isFinite(n)?1:n<1?1:n>6?6:Math.floor(n);
export default function Wizard(){const {app,update}=useApplicationStore(); const location=useLocation(); const navigate=useNavigate(); const stepFromUrl=useMemo<number|null>(()=>{const m=location.pathname.match(STEP_PATTERN); if(!m) return null; const n=Number(m[1]); return n>=1&&n<=6?n:null;},[location.pathname]); const effectiveStep=clampStep(stepFromUrl??app.currentStep??1); useEffect(()=>{if(stepFromUrl==null||app.currentStep===stepFromUrl) return; update({currentStep:stepFromUrl});},[stepFromUrl,app.currentStep,update]); const cached=OfflineStore.load() as {applicationToken?:string|null}|null; const hasAppToken=Boolean(app.applicationToken)||Boolean(cached?.applicationToken); useEffect(()=>{if(effectiveStep>1&&!hasAppToken&&location.pathname!=="/apply/step-1") navigate("/apply/step-1",{replace:true});},[effectiveStep,hasAppToken,location.pathname,navigate]); let safeStep=effectiveStep; if(safeStep>1&&!hasAppToken) safeStep=1; const StepComponent=STEP_COMPONENTS[safeStep-1]??Step1; return <StepComponent/>;}
// BF_CLIENT_WIZARD_URL_SOT_v56_WIZARD_ANCHOR
