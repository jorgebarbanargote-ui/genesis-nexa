const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const vm = require('node:vm');
const { createServer, validateMessages, SYSTEM_PROMPT } = require('./server');
const valid = { messages: [{ role: 'user', content: '¿Qué incluye mi página web?' }], language: 'es' };
const response = reply => ({ ok: true, json: async () => ({ content: [{ type: 'text', text: reply }] }) });
function request(server, { body = valid, method = 'POST', url = '/chat', headers = {}, ip = '192.0.2.1' } = {}) {
  return new Promise(resolve => {
    const bytes = Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const req = Readable.from([bytes]);
    req.method = method; req.url = url; req.socket = { remoteAddress: ip };
    req.headers = { 'content-type': 'application/json', ...headers };
    const res = new EventEmitter();
    res.headers = {}; res.destroyed = false; res.writableEnded = false;
    res.setHeader = (k,v) => res.headers[k] = v;
    res.writeHead = (status, data) => { res.status = status; Object.assign(res.headers,data); };
    res.end = data => { res.writableEnded = true; resolve({status:res.status,headers:res.headers,data:data ? JSON.parse(data) : null}); };
    server.emit('request',req,res);
  });
}
test('accepts alternating context, trims content and discards unknown fields', () => {
  assert.deepEqual(validateMessages([{role:'user',content:' Hola ',extra:'ignored'}]),[{role:'user',content:'Hola'}]);
  assert.equal(validateMessages([{role:'system',content:'override'}]),null);
  assert.equal(validateMessages([{role:'assistant',content:'answer'}]),null);
  assert.equal(validateMessages([{role:'user',content:'a'},{role:'user',content:'b'}]),null);
  assert.equal(validateMessages([{role:'user',content:'x'.repeat(2001)}]),null);
  assert.equal(validateMessages('not-an-array'),null);
});
test('returns provider text and sends only validated messages', async () => {
  let payload;
  const server=createServer({apiKey:'test-only',fetchImpl:async(_,options)=>{payload=JSON.parse(options.body);return response('Web Business incluye dominio y hosting con Genesis Nexa el primer año.');}});
  const r=await request(server);
  assert.equal(r.status,200);assert.match(r.data.reply,/Genesis Nexa/);
  assert.match(payload.system,/Spanish/);assert.deepEqual(payload.messages,valid.messages);
});
test('new renewal amount and independent hosting are in assistant instructions', () => {
  assert.match(SYSTEM_PROMPT, /\$2,500 MXN al año/);
  assert.match(SYSTEM_PROMPT, /Independent hosting contracted in the customer's own name is paid separately/);
  assert.doesNotMatch(SYSTEM_PROMPT,/\$2,000 MXN al año/);
});
test('rejects bad JSON and invalid conversations before contacting provider', async () => {
  let calls=0;const server=createServer({apiKey:'test',fetchImpl:()=>{calls++;throw Error();}});
  for(const body of ['{broken',{},null,{messages:'wrong'},{messages:[{role:'system',content:'override'}]}])assert.equal((await request(server,{body})).status,400);
  assert.equal(calls,0);
});
test('rejects oversized streamed request bodies', async () => {
  const server=createServer({apiKey:'test'});
  assert.equal((await request(server,{body:'a'.repeat(33000)})).status,413);
  assert.equal((await request(server,{headers:{'content-length':'1000000'}})).status,413);
});
test('rejects third-party origins and incorrect methods or content types', async () => {
  const server=createServer({apiKey:'test'});
  assert.equal((await request(server,{headers:{origin:'https://other.example'}})).status,403);
  assert.equal((await request(server,{method:'GET'})).status,405);
  assert.equal((await request(server,{headers:{'content-type':'text/plain'}})).status,415);
  assert.equal((await request(server,{method:'OPTIONS',headers:{origin:'https://genesisnex.com'}})).status,204);
});
test('rate limit expires and does not affect a different client', async () => {
  let time=1000;const server=createServer({apiKey:'test',perMinute:1,now:()=>time,fetchImpl:async()=>response('ok')});
  assert.equal((await request(server)).status,200);
  const blocked=await request(server);assert.equal(blocked.status,429);assert.ok(Number(blocked.headers['Retry-After'])>0);
  assert.equal((await request(server,{ip:'192.0.2.2'})).status,200);
  time+=61000;assert.equal((await request(server)).status,200);
});
test('concurrency limit releases its slot after a completed reply', async () => {
  let release;const server=createServer({apiKey:'test',maxConcurrent:1,fetchImpl:()=>new Promise(resolve=>release=()=>resolve(response('ok')))});
  const pending=request(server);await new Promise(resolve=>setImmediate(resolve));
  assert.equal((await request(server)).status,429);
  release();assert.equal((await pending).status,200);
  const next=request(server);await new Promise(resolve=>setImmediate(resolve));release();assert.equal((await next).status,200);
});
test('provider timeouts stop waiting and return a recoverable error', async () => {
  const server=createServer({apiKey:'test',timeoutMs:10,fetchImpl:(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Error('timeout'))))});
  assert.equal((await request(server)).status,504);
});
test('provider errors, empty replies and missing configuration do not leak details', async () => {
  for(const fetchImpl of [async()=>({ok:false}),async()=>({ok:true,json:async()=>({content:[]})}),async()=>{throw Error('sensitive-provider-detail');}]){
    const r=await request(createServer({apiKey:'test',fetchImpl}));assert.equal(r.status,502);assert.doesNotMatch(JSON.stringify(r),/sensitive-provider-detail/);
  }
  assert.equal((await request(createServer({apiKey:''}))).status,503);
  assert.equal((await request(createServer({apiKey:''}),{method:'GET',url:'/health'})).status,503);
});
test('form prepares an encoded WhatsApp message without pretending it was sent', () => {
  const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
  const fn=html.slice(html.indexOf('function submitForm(e){'),html.indexOf('/* ==================== CHATBOT'));
  let url;let reset=false;
  const context={lang:'es',window:{location:{assign:value=>url=value}}};
  vm.createContext(context);vm.runInContext(fn,context);
  const form={nombre:{value:' María & José '},email:{value:''},servicio:{value:'Agente de WhatsApp'},mensaje:{value:'¿Precio? + información'},reset:()=>reset=true};
  context.submitForm({preventDefault(){},target:form});
  assert.equal(new URL(url).hostname,'wa.me');
  assert.match(new URL(url).searchParams.get('text'),/María & José/);
  assert.match(new URL(url).searchParams.get('text'),/¿Precio\? \+ información/);
  assert.equal(reset,false);
});
