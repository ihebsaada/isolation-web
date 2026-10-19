import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sitemap from '../src/app/sitemap.ts';
import robots from '../src/app/robots.ts';
import { SITE_URL, PUBLIC_PAGES, publicMetadata, canonicalUrl } from '../src/lib/seo.ts';

test('sitemap contains only existing public routes and stable meaningful dates', () => {
  const entries = sitemap();
  assert.deepEqual(entries.map(e => e.url), [SITE_URL, SITE_URL + '/isolation/estimation']);
  for(const entry of entries){
    const route = new URL(entry.url).pathname;
    assert.ok(fs.existsSync(new URL(`../src/app${route === '/' ? '' : route}/page.tsx`,import.meta.url)));
    assert.ok(!/leads|api|login|debug|localhost|vercel\.app/.test(entry.url));
    assert.ok(Number.isFinite(Date.parse(entry.lastModified)));
    assert.equal(entry.changeFrequency,'monthly');
    assert.ok(entry.priority>0 && entry.priority<=1);
  }
});

test('robots allows public crawling, blocks private paths and declares sitemap', () => {
  assert.deepEqual(robots(),{
    rules:{userAgent:'*',allow:'/',disallow:['/leads','/api/']},
    sitemap:SITE_URL+'/sitemap.xml',
  });
});

test('public metadata has unique titles/descriptions, exact canonicals, index directives and real images', () => {
  const titles=new Set(),descriptions=new Set();
  for(const page of PUBLIC_PAGES){
    const metadata=publicMetadata(page.path);
    titles.add(metadata.title);descriptions.add(metadata.description);
    assert.equal(metadata.alternates.canonical,canonicalUrl(page.path));
    assert.deepEqual(metadata.robots,{index:true,follow:true});
    assert.equal(metadata.openGraph.url,metadata.alternates.canonical);
    assert.equal(metadata.openGraph.locale,'fr_CA');
    assert.equal(metadata.openGraph.title,metadata.title);
    assert.equal(metadata.openGraph.description,metadata.description);
    for(const image of metadata.openGraph.images)assert.ok(fs.existsSync(new URL('../public'+image.url,import.meta.url)));
    assert.equal(metadata.twitter.card,'summary_large_image');
  }
  assert.equal(titles.size,2);assert.equal(descriptions.size,2);
});
