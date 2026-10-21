import fs from 'node:fs/promises';
import { parseCsv } from './csv.mjs';
import { serviceCoverage } from '../../src/data/isolation.ts';
import { normalizeCity } from '../../src/lib/service-area.ts';

const root='work/coverage-review';
const service='https://servicescarto.mern.gouv.qc.ca/pes/rest/services/Territoire/SDA_WMS/MapServer/2';
const [headers,...records]=parseCsv(await fs.readFile(`${root}/raw/MUN.csv`,'utf8'));
const municipalities=records.map(values=>Object.fromEntries(headers.map((k,i)=>[k,values[i]])));
const anchors=serviceCoverage.cities.map(name=>{
  const matches=municipalities.filter(m=>normalizeCity(m.munnom)===normalizeCity(name));
  if(matches.length!==1)throw Error(`Municipality not uniquely resolved: ${name}`);
  return {name,id:matches[0].mcode};
});
await fs.mkdir(`${root}/raw/sda`,{recursive:true});
async function query(name,params){
  const file=`${root}/raw/sda/${name}.json`;
  try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const response=await fetch(`${service}/query`,{method:'POST',body:new URLSearchParams({f:'json',...params}),signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error(`SDA HTTP ${response.status}`);
  const data=await response.json();
  if(data.error||data.exceededTransferLimit)throw Error(JSON.stringify(data.error||'Incomplete SDA response'));
  await fs.writeFile(file,JSON.stringify(data));return data;
}
const fields='MUS_CO_GEO,MUS_NM_MUN,MUS_CO_MRC,MUS_NM_MRC,MUS_CO_REG,MUS_NM_REG,MUS_CO_VER';
const features=await query('anchors',{where:`MUS_CO_GEO IN (${anchors.map(a=>`'${a.id}'`).join(',')})`,outFields:fields,returnGeometry:'true',returnCentroid:'true'});
if(features.features.length!==anchors.length)throw Error('Missing anchor polygons');
const adjacency=[];
for(const anchor of anchors){
  const feature=features.features.find(f=>f.attributes.MUS_CO_GEO===anchor.id);
  if(!feature.geometry)throw Error('Missing anchor geometry');
  const neighbours=await query(`touches-${anchor.id}`,{
    where:'1=1',outFields:fields,returnGeometry:'false',
    geometryType:'esriGeometryPolygon',spatialRel:'esriSpatialRelTouches',
    inSR:String(features.spatialReference.wkid),
    geometry:JSON.stringify({...feature.geometry,spatialReference:features.spatialReference}),
  });
  adjacency.push({anchor,neighbours:neighbours.features.map(f=>f.attributes)});
  console.log(`${anchor.name}: ${neighbours.features.length} touching entities`);
}
const ids=[...new Set([...anchors.map(a=>a.id),...adjacency.flatMap(a=>a.neighbours.map(n=>n.MUS_CO_GEO))])];
await query('candidate-polygons',{where:`MUS_CO_GEO IN (${ids.map(id=>`'${id}'`).join(',')})`,outFields:fields,returnGeometry:'true'});
await fs.writeFile(`${root}/adjacency-evidence.json`,JSON.stringify({
  source:service,relation:'esriSpatialRelTouches',retrievedAt:new Date().toISOString(),
  note:'Touching entities only; shared-line evidence is computed separately from unmodified polygon segments. No approval, water crossing or road access is inferred.',
  anchors,adjacency,
},null,2)+'\n');
