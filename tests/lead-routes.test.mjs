import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { columns } from '../src/lib/lead-record.ts';
import { buildLead, captureAttribution, emptyProject } from '../src/lib/leads.ts';
import { timings } from '../src/data/isolation.ts';

// Execute the actual route/server/session modules with only the Next request
// cookie context and external Google transport replaced by test doubles.
function runtime(rows, { rejectPending = false } = {}) {
  const require = createRequire(import.meta.url), cache = new Map();
  let cookie = '', unavailable = false;
  const context = { process, Request, Response, URL, URLSearchParams, AbortSignal, Date, crypto: globalThis.crypto,
    fetch: async (_url, options) => {
      if (unavailable) throw Error('Synthetic storage failure');
      const body = JSON.parse(options.body);
      assert.equal(body.token, 'synthetic-integration-secret');
      if (body.action === 'loginAttempt') return Response.json({ok:true,allowed:true});
      if (body.action === 'list') return Response.json({ok:true,leads:rows});
      if (body.action === 'append') {
        // Published Apps Script v4 rejects this status before appending a row.
        if (rejectPending && body.lead.qualification_status === 'pending') return Response.json({ok:false});
        const prior=rows.find(r=>r.lead_id===body.lead.lead_id);
        if(!prior)rows.push(body.lead);
        return Response.json({ok:true,lead:prior||body.lead});
      }
      if (body.action === 'update') {
        const row=rows.find(r=>r.lead_id===body.lead_id);
        if(!row)return Response.json({ok:false});
        row.call_status=body.call_status;row.notes=body.notes;
        return Response.json({ok:true});
      }
      throw Error('Unexpected storage operation');
    },
  };
  function load(file) {
    if(cache.has(file))return cache.get(file).exports;
    const loadedModule={exports:{}};cache.set(file,loadedModule);
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{
      compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
    }).outputText;
    const localRequire = specifier => {
      if(specifier==='next/headers')return {cookies:async()=>({get:()=>cookie?{value:cookie}:undefined})};
      if(specifier.startsWith('@/'))return load(path.resolve('src',specifier.slice(2)+'.ts'));
      if(specifier.startsWith('.'))return load(path.resolve(path.dirname(file),specifier));
      return require(specifier);
    };
    vm.runInNewContext('(function(require,module,exports){'+code+'\n})',context,{filename:file})(localRequire,loadedModule,loadedModule.exports);
    return loadedModule.exports;
  }
  return {load:p=>load(path.resolve(p)),setCookie:v=>{cookie=v;},fail:()=>{unavailable=true;}};
}

test('actual lead routes: login, protected list, status/notes, both filtered exports and failures', async () => {
  const names=['NODE_ENV','VERCEL','LEADS_ACCESS_CODE','GOOGLE_APPS_SCRIPT_URL','GOOGLE_APPS_SCRIPT_SECRET'];
  const original=Object.fromEntries(names.map(k=>[k,process.env[k]]));
  try {
    process.env.NODE_ENV='development';delete process.env.VERCEL;
    process.env.LEADS_ACCESS_CODE='synthetic-access-code-123';
    process.env.GOOGLE_APPS_SCRIPT_URL='https://script.google.com/macros/s/synthetic/exec';
    process.env.GOOGLE_APPS_SCRIPT_SECRET='synthetic-integration-secret';
    const lead={...Object.fromEntries(columns.map(k=>[k,''])),lead_id:crypto.randomUUID(),
      submitted_at:'2026-01-15T15:30:00Z',name:'Synthetic Lead',phone:'5145550123',
      qualification_status:'qualified',call_status:'new',utm_campaign:'test campaign',fbclid:'test fb'};
    const rows=[lead,{...lead,lead_id:crypto.randomUUID(),name:'Other',qualification_status:'rejected'}];
    const r=runtime(rows),login=r.load('src/app/api/leads/login/route.ts');
    const leads=r.load('src/app/api/leads/route.ts'),exports=r.load('src/app/api/leads/export/route.ts');
    const base='http://127.0.0.1:3012';
    const request=(route,method='GET',body)=>new Request(base+route,{method,headers:{origin:base,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    assert.equal((await leads.GET(request('/api/leads'))).status,401);
    for(const query of ['', '?format=call-center'])assert.equal((await exports.GET(request('/api/leads/export'+query))).status,401);
    assert.equal((await login.POST(request('/api/leads/login','POST',{code:'wrong'}))).status,401);
    const accepted=await login.POST(request('/api/leads/login','POST',{code:process.env.LEADS_ACCESS_CODE}));
    assert.equal(accepted.status,200);
    const cookie=accepted.headers.get('set-cookie');
    for(const flag of ['HttpOnly','Secure','SameSite=strict'])assert.ok(cookie.includes(flag));
    r.setCookie(cookie.match(/leads_session=([^;]+)/)[1]);
    let response=await leads.GET(request('/api/leads?qualification=qualified'));
    assert.equal(response.status,200);assert.equal((await response.json()).leads.length,1);
    response=await leads.PATCH(request('/api/leads','PATCH',{lead_id:lead.lead_id,call_status:'contacted',notes:'Call tomorrow'}));
    assert.equal(response.status,200);assert.equal(rows[0].call_status,'contacted');assert.equal(rows[0].notes,'Call tomorrow');
    assert.equal(rows[1].call_status,'new');assert.equal(rows[1].notes,'');
    const listed=await (await leads.GET(request('/api/leads?status=contacted'))).json();
    assert.equal(listed.leads[0].notes,'Call tomorrow');
    for(const format of ['', '&format=call-center']){
      response=await exports.GET(request('/api/leads/export?status=contacted'+format));
      assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
      assert.equal(response.headers.get('content-type'),'text/csv; charset=utf-8');
      const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.subarray(0,3).toString('hex'),'efbbbf');
      const text=bytes.toString('utf8');assert.ok(text.includes('Synthetic Lead'));assert.ok(!text.includes('Other'));
      assert.ok(text.includes('Call tomorrow'));
      if(format){assert.ok(text.includes('Téléphone'));assert.ok(text.includes('Contacté'));assert.ok(!text.includes('fbclid'));}
      else{assert.ok(text.includes('lead_id'));assert.ok(text.includes('fbclid'));assert.ok(text.includes('test fb'));}
      for(const secret of [process.env.LEADS_ACCESS_CODE,process.env.GOOGLE_APPS_SCRIPT_SECRET])assert.ok(!text.includes(secret));
    }
    const foreign=new Request(base+'/api/leads',{method:'PATCH',headers:{origin:'http://evil.invalid'},body:'{}'});
    assert.equal((await leads.PATCH(foreign)).status,403);
    const project={...emptyProject,city:'Montreal',postalCode:'H2X1Y4',owner:'YES',detached:true,
      estimate:'true',need:'Sous-sol',timing:timings[0],name:'Synthetic Montreal',phone:'5145550123',consent:true};
    const submission={...buildLead(project,captureAttribution('')),project,website:'',classification:'qualified'};
    assert.doesNotThrow(()=>r.load('src/lib/lead-record.ts').makeRecord(submission));
    const acceptedSubmission=await leads.POST(request('/api/leads','POST',submission));
    assert.equal(acceptedSubmission.status,200);
    const receipt=await acceptedSubmission.json();
    assert.equal(receipt.accepted,true);assert.equal(receipt.qualification_status,'pending');
    assert.equal(receipt.lead_id,submission.lead_id);
    const saved=rows.find(r=>r.lead_id===receipt.lead_id);
    assert.equal(saved.qualification_pending,'true');assert.equal(saved.intent,'oui');assert.equal(saved.call_status,'new');
    const count=rows.length;
    assert.equal((await leads.POST(request('/api/leads','POST',submission))).status,200);assert.equal(rows.length,count);
    const pendingRows=await (await leads.GET(request('/api/leads?qualification=pending'))).json();
    assert.equal(pendingRows.leads.length,1);assert.equal(pendingRows.leads[0].lead_id,receipt.lead_id);
    assert.equal((await leads.PATCH(request('/api/leads','PATCH',{
      lead_id:receipt.lead_id,call_status:'appointment',notes:'Synthetic verification required',
    }))).status,200);
    assert.equal(saved.qualification_status,'pending');assert.equal(saved.qualification_pending,'true');
    const friendly=await (await exports.GET(request('/api/leads/export?qualification=pending&format=call-center'))).text();
    assert.ok(friendly.includes('À vérifier'));assert.ok(friendly.includes('Synthetic Montreal'));
    const technical=await (await exports.GET(request('/api/leads/export?qualification=pending'))).text();
    assert.ok(technical.includes('"pending"'));
    saved.qualification_status='qualified'; // Synthetic contradictory storage receipt.
    assert.equal((await leads.POST(request('/api/leads','POST',submission))).status,503);
    saved.qualification_status='pending';
    r.fail();assert.equal((await exports.GET(request('/api/leads/export?format=call-center'))).status,503);
    assert.equal((await leads.POST(request('/api/leads','POST',submission))).status,503);
    assert.equal((await leads.GET(request('/api/leads'))).status,503);
    r.setCookie('');assert.equal((await leads.PATCH(request('/api/leads','PATCH',{}))).status,401);
  } finally {
    for(const key of names){if(original[key]===undefined)delete process.env[key];else process.env[key]=original[key];}
  }
});

test('Montreal pending: legacy Apps Script HTTP 200/ok:false becomes 503 without a write; compatible storage accepts one retry', async () => {
  const names=['NODE_ENV','VERCEL','GOOGLE_APPS_SCRIPT_URL','GOOGLE_APPS_SCRIPT_SECRET'];
  const original=Object.fromEntries(names.map(k=>[k,process.env[k]]));
  try {
    process.env.NODE_ENV='development';delete process.env.VERCEL;
    process.env.GOOGLE_APPS_SCRIPT_URL='https://script.google.com/macros/s/synthetic/exec';
    process.env.GOOGLE_APPS_SCRIPT_SECRET='synthetic-integration-secret';
    const project={...emptyProject,city:'Montreal',postalCode:'H2X1Y4',owner:'oui',detached:'oui',
      estimate:'oui',need:'Murs',timing:timings[0],name:'Synthetic pending incident',phone:'5145550123',consent:true};
    const submission={...buildLead(project,captureAttribution('')),website:''};
    const rows=[];
    const legacy=runtime(rows,{rejectPending:true}).load('src/app/api/leads/route.ts');
    const request=()=>new Request('http://127.0.0.1:3012/api/leads',{method:'POST',
      headers:{origin:'http://127.0.0.1:3012','Content-Type':'application/json'},body:JSON.stringify(submission)});
    for(let retry=0;retry<2;retry++) {
      const response=await legacy.POST(request());
      assert.equal(response.status,503);
      const body=await response.json();
      assert.deepEqual(body,{error:'Persistence unavailable'});
      assert.ok(!('accepted' in body));
      assert.equal(rows.length,0);
    }
    const compatible=runtime(rows).load('src/app/api/leads/route.ts');
    for(let retry=0;retry<2;retry++) {
      const response=await compatible.POST(request());
      assert.equal(response.status,200);
      const receipt=await response.json();
      assert.equal(receipt.lead_id,submission.lead_id);
      assert.equal(receipt.qualification_status,'pending');
      assert.equal(rows.length,1);
      assert.equal(rows[0].qualification_pending,'true');
    }
  } finally {
    for(const key of names){if(original[key]===undefined)delete process.env[key];else process.env[key]=original[key];}
  }
});
