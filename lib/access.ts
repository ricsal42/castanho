import {env} from 'cloudflare:workers';
export function secret(k:string){const v=(env as unknown as Record<string,string>)[k];if(!v)throw Error('Configuração de acesso em falta.');return v}
async function sign(s:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret('SESSION_SECRET')),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(s)))).map(n=>n.toString(16).padStart(2,'0')).join('')}
export async function token(){const t=String(Date.now()+86400000);return t+'.'+await sign(t)}
export async function authorized(r:Request){const t=r.headers.get('cookie')?.match(/(?:^|; )empresas_session=([^;]+)/)?.[1];if(!t)return false;const [time,sig]=t.split('.');return Number(time)>Date.now()&&sig===await sign(time)}
export function sameOrigin(r:Request){return r.headers.get('origin')===new URL(r.url).origin}
export function json(v:unknown,status=200){return Response.json(v,{status,headers:{'Cache-Control':'no-store'}})}
