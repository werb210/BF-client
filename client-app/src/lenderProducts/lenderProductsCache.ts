import { openDB } from "idb";
const DB="bf-lp-cache-v1"; const STORE="products";
async function db(){return openDB(DB,1,{upgrade(d){d.createObjectStore(STORE,{keyPath:"id"});}});} 
const API_BASE=(((import.meta as any).env?.VITE_API_BASE_URL||"https://server.boreal.financial").replace(/\/$/,""));
export async function fetchLenderProducts(): Promise<any[]>{ try{const r=await fetch(`${API_BASE}/api/client/lender-products`,{credentials:"include"}); if(r.ok){const data=await r.json(); const products=data.products||data.data||[]; const d=await db(); const tx=d.transaction(STORE,"readwrite"); const all=await tx.store.getAll(); for(const p of all) await tx.store.delete(p.id); for(const p of products) await tx.store.put(p); await tx.done; return products;}}catch{} const d=await db(); return d.getAll(STORE);} 
