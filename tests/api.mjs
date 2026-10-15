import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const dir=new URL('../.sites-runtime/tests/',import.meta.url);mkdirSync(dir,{recursive:true});
for(const [file,name] of [['lib/access.ts','access'],['app/api/auth/route.ts','auth'],['app/api/data/route.ts','data']]){
 let s=readFileSync(new URL('../'+file,import.meta.url),'utf8').replace(/import \{\s*env\s*\} from ["']cloudflare:workers["'];?/,'const env=globalThis.__testEnv;').replaceAll("'@/lib/access'","'./access.mjs'");
 writeFileSync(new URL(name+'.mjs',dir),ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
}
const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../drizzle/0000_panoramic_bloodscream.sql',import.meta.url),'utf8'));sqlite.exec('PRAGMA foreign_keys=ON');
function prepare(sql,values=[]){return {bind(...v){return prepare(sql,v)},async first(){return sqlite.prepare(sql).get(...values)||null},async run(){const r=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)}}},async all(){return {results:sqlite.prepare(sql).all(...values)}} ,sql,values}}
const bucket=new Map();globalThis.__testEnv={DB:{prepare,async batch(a){sqlite.exec('BEGIN');try{const r=[];for(const s of a){if(/^SELECT/i.test(s.sql))r.push(await s.all());else r.push(await s.run())}sqlite.exec('COMMIT');return r}catch(e){sqlite.exec('ROLLBACK');throw e}}},BUCKET:{async put(k,v){bucket.set(k,v)}},SESSION_SECRET:'test-session-secret',ACCESS_PASSWORD:'1324',DELETE_CODE:'9999'};
const auth=await import(new URL('auth.mjs',dir));const api=await import(new URL('data.mjs',dir));const origin='https://test.example';let cookie='';
function req(path,body,opts={}){return new Request(origin+path,{method:body?'POST':'GET',headers:{origin,cookie,'content-type':'application/json',...opts},...(body?{body:JSON.stringify(body)}:{})})}
assert.equal((await api.GET(req('/api/data'))).status,401);
assert.equal((await auth.POST(req('/api/auth',{password:'bad'}))).status,401);
const login=await auth.POST(req('/api/auth',{password:'1324'}));assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];assert.ok(login.headers.get('set-cookie').includes('HttpOnly'));
assert.equal((await auth.GET(req('/api/auth'))).status,200);
assert.equal((await api.POST(req('/api/data',{action:'category',category:{id:'c1',name:'Eletricidade'}},{origin:'https://evil.example'}))).status,403);
let r=await api.POST(req('/api/data',{action:'category',category:{id:'c1',name:'Eletricidade'}}));assert.equal(r.status,200);assert.equal((await r.json()).categories.length,1);
assert.equal((await api.POST(req('/api/data',{action:'category',category:{id:'c2',name:'eletricidade'}}))).status,409);
const c={id:'e1',name:'Empresa de teste',categoryId:'c1',email:'geral@example.com',contact:'210000000',website:'https://example.com',notes:'Teste',image:''};
assert.equal((await api.POST(req('/api/data',{action:'company',company:{...c,website:'https://'}}))).status,400);
assert.equal((await api.POST(req('/api/data',{action:'company',company:{...c,email:'invalid'}}))).status,400);
r=await api.POST(req('/api/data',{action:'company',company:c}));assert.equal(r.status,200);let d=await r.json();assert.equal(d.companies.length,1);assert.ok(d.lastBackup);const saved=d.companies[0];
const secondDevice=await (await api.GET(req('/api/data'))).json();assert.equal(secondDevice.companies[0].email,c.email);
assert.equal((await api.POST(req('/api/data',{action:'company',company:{...saved,updatedAt:'stale'}}))).status,409);
assert.equal((await api.POST(req('/api/data',{action:'removeCategory',id:'c1'}))).status,409);
assert.equal((await api.POST(req('/api/data',{action:'remove',id:'e1',updatedAt:saved.updatedAt,code:'0000'}))).status,403);
assert.equal((await api.POST(req('/api/data',{action:'company',company:{...saved,name:'Empresa editada'}}))).status,200);
d=await (await api.GET(req('/api/data'))).json();const edited=d.companies[0];
assert.equal((await api.POST(req('/api/data',{action:'remove',id:'e1',updatedAt:edited.updatedAt,code:'9999'}))).status,200);
assert.equal((await api.POST(req('/api/data',{action:'company',company:saved}))).status,409);
assert.equal((await api.POST(req('/api/data',{action:'import',data:{format:'empresas-obra',version:1,categories:[{id:'c1',name:'Eletricidade'}],companies:[saved]}}))).status,200);
assert.equal((await api.POST(req('/api/data',{action:'import',data:{format:'empresas-obra',version:1,categories:[{id:'c1',name:'Eletricidade'}],companies:[saved]}}))).status,200);
d=await (await api.GET(req('/api/data'))).json();assert.equal(d.companies.length,1);assert.equal(bucket.size,1);assert.equal(JSON.parse([...bucket.values()][0]).companies.length,1);
assert.equal((await api.POST(req('/api/data',{action:'import',data:{format:'empresas-obra',version:1,categories:[],companies:[saved]}}))).status,400);
for(const supplied of [{email:''},{}]){
 const optional={...c,id:'optional-'+Object.keys(supplied).length,...supplied};if(!Object.keys(supplied).length)delete optional.email;
 const result=await api.POST(req('/api/data',{action:'company',company:optional}));assert.equal(result.status,200);const current=await result.json();const savedOptional=current.companies.find(c=>c.id===optional.id);assert.equal(savedOptional.email,'');
 assert.equal((await api.POST(req('/api/data',{action:'remove',id:optional.id,updatedAt:savedOptional.updatedAt,code:'9999'}))).status,200);
}
console.log('API: acesso, palavra-passe, origem, CRUD, conflitos, validação, eliminação protegida, partilha, importação e backup verificados.');sqlite.close();
