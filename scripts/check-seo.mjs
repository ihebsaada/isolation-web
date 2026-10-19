import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { SITE_URL, canonicalUrl } from '../src/lib/seo.ts';

// Read-only acceptance against a local production build; never a live site.
const base = 'http://127.0.0.1:3017';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start',
  '--hostname', '127.0.0.1', '--port', '3017'], {stdio:'pipe',windowsHide:true});
let log = '';
server.stdout.on('data',data=>{log+=data;});
server.stderr.on('data',data=>{log+=data;});
try {
  let ready=false;
  for(let i=0;i<100;i++){
    if(server.exitCode!==null)throw Error('Local server failed: '+log);
    try {if((await fetch(base+'/robots.txt',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}
    await delay(100);
  }
  assert.ok(ready,'Local production server did not start');
  const sitemap=await fetch(base+'/sitemap.xml');
  assert.equal(sitemap.status,200);
  assert.match(sitemap.headers.get('content-type'),/xml/);
  const xml=await sitemap.text();
  assert.deepEqual([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]),[
    SITE_URL,SITE_URL+'/isolation/estimation',
  ]);
  const robots=await fetch(base+'/robots.txt');
  assert.equal(robots.status,200);
  const rules=await robots.text();
  for(const rule of ['User-Agent: *','Allow: /','Disallow: /leads','Disallow: /api/',
    'Sitemap: '+SITE_URL+'/sitemap.xml'])assert.ok(rules.toLowerCase().includes(rule.toLowerCase()),rule);
  const titles=[];
  for(const path of ['/','/isolation/estimation']){
    const response=await fetch(base+path+'?utm_source=test',{headers:{'user-agent':'Googlebot'}});
    assert.equal(response.status,200);
    assert.ok(!/noindex/.test(response.headers.get('x-robots-tag')||''));
    const html=await response.text();
    assert.match(html,/<html[^>]*lang="fr-CA"/);
    assert.match(html,/<meta name="robots" content="index, follow"/);
    assert.ok(!html.includes('noindex'));
    const canonical=[...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
    assert.equal(canonical.length,1);assert.equal(canonical[0][1],canonicalUrl(path));
    assert.ok(html.includes(`<meta property="og:url" content="${canonicalUrl(path)}"`));
    assert.match(html,/<meta property="og:locale" content="fr_CA"/);
    assert.ok(html.includes(SITE_URL+'/assets/homes/isolation-maison-hiver.png'));
    assert.match(html,/<meta name="description" content="[^"]+"/);
    assert.match(html,/<h1[ >]/);
    titles.push(html.match(/<title>(.*?)<\/title>/)[1]);
  }
  assert.equal(new Set(titles).size,2);
  const privatePage=await fetch(base+'/leads');
  assert.equal(privatePage.status,200);
  const privateHtml=await privatePage.text();
  assert.match(privateHtml,/<meta name="robots" content="noindex, nofollow"/);
  assert.ok(!privateHtml.includes('rel="canonical"'));
  assert.ok(!privateHtml.includes('tel:'));
  assert.match(privateHtml,/name="code"/);
  for(const path of ['/api/leads','/api/leads/export','/api/leads/export?format=call-center']){
    const response=await fetch(base+path);
    assert.equal(response.status,401);
    assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
  }
  for(const path of ['/assets/brand/demco-logo.png','/assets/homes/isolation-maison-hiver.png']) {
    assert.equal((await fetch(base+path,{method:'HEAD'})).status,200);
  }
  console.log('PASS: local production robots/sitemap, public metadata/canonicals, images, private noindex and protected API responses.');
} finally {
  if(server.exitCode===null){const closed=once(server,'exit');server.kill();await closed;}
}
