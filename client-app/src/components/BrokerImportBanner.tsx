// BF_CLIENT_BLOCK_v523_BROKER_IMPORT
import { useState } from "react";
import { useApplicationStore } from "../state/useApplicationStore";
import { readBrokerNotice } from "../wizard/brokerPrefill";
export function BrokerImportBanner(){const{app}=useApplicationStore();const[hidden,setHidden]=useState(false);const notice=readBrokerNotice(app.applicationToken??null);if(!notice||hidden)return null;return <div role="status" data-testid="broker-import-banner" style={{margin:"0 0 12px",padding:"12px 14px",borderRadius:10,background:"#eff6ff",border:"1px solid #bfdbfe",color:"#1e3a8a",fontSize:14,lineHeight:1.45}}><strong>We have filled in your application from {notice.brokerName}.</strong>{" "}Please check each answer as you go. Your documents are already attached.{notice.missing.length>0&&<div style={{marginTop:6}}>Still needed from you: {notice.missing.join(", ")}.</div>}<button type="button" onClick={()=>setHidden(true)} style={{marginTop:8,display:"block",background:"transparent",border:"none",color:"#1d4ed8",padding:0,cursor:"pointer",fontSize:13,textDecoration:"underline"}}>Hide this message</button></div>}
export default BrokerImportBanner;
