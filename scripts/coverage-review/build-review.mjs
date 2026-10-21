import fs from 'node:fs';
import readline from 'node:readline';
import { createHash } from 'node:crypto';
import { parseCsv, csvCell } from './csv.mjs';
import { hasSharedSegment } from './proposed-classifier.mjs';
import { normalizeCity } from '../../src/lib/service-area.ts';

const root='work/coverage-review';
const [headers,...records]=parseCsv(fs.readFileSync(`${root}/raw/MUN.csv`,'utf8'));
const municipalities={};
for(const values of records){
  const r=Object.fromEntries(headers.map((k,i)=>[k,values[i]]));
  municipalities[r.mcode]={id:r.mcode,name:r.munnom,mrc:r.mrc,region:r.regadm,population:Number(r.mpopul)};
}
const names={},postals={},stats={};let cpHeaders,recordCount=0;
function register(name,id){const key=normalizeCity(name);names[key]??=[];if(!names[key].includes(id))names[key].push(id);}
for(const m of Object.values(municipalities))register(m.name,m.id);
for await(const line of readline.createInterface({input:fs.createReadStream(`${root}/raw/cp-territoires.csv`),crlfDelay:Infinity})){
  if(!line.trim())continue;
  const values=parseCsv(line)[0];
  if(!cpHeaders){cpHeaders=values;continue;}
  if(values.length!==cpHeaders.length)throw Error('Unexpected postal CSV row length');
  const r=Object.fromEntries(cpHeaders.map((k,i)=>[k,values[i]]));recordCount++;
  const cp=r.CP.replace(/\s/g,'').toUpperCase(),id=r.CO_MUN;
  postals[cp]??=[];if(!postals[cp].includes(id))postals[cp].push(id);
  if(municipalities[id])register(r.NOM_MUN,id);
  stats[id]??={postals:new Set(),sample:null};stats[id].postals.add(cp);
  if(!stats[id].sample||cp<stats[id].sample.cp)stats[id].sample={cp,lat:Number(r.LAT),lon:Number(r.LONG)};
}
for(const ids of Object.values(names))ids.sort();
for(const ids of Object.values(postals))ids.sort();
const evidence=JSON.parse(fs.readFileSync(`${root}/adjacency-evidence.json`));
const polygons=JSON.parse(fs.readFileSync(`${root}/raw/sda/candidate-polygons.json`));
const byId=new Map(polygons.features.map(f=>[f.attributes.MUS_CO_GEO,f]));
if(evidence.anchors.some(a=>!byId.has(a.id)))throw Error('Missing anchor geometry');
const nodes=new Map(evidence.anchors.map(a=>[a.id,{id:a.id,name:a.name,anchor:true,touching:[],shared:[]}]));
for(const {anchor,neighbours} of evidence.adjacency)for(const attrs of neighbours){
  const id=attrs.MUS_CO_GEO;
  if(!nodes.has(id))nodes.set(id,{id,name:attrs.MUS_NM_MUN,anchor:false,touching:[],shared:[]});
  const item=nodes.get(id);item.touching.push(anchor.name);
  if(hasSharedSegment(byId.get(anchor.id)?.geometry,byId.get(id)?.geometry))item.shared.push(anchor.name);
}
const rows=[...nodes.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(item=>{
  const m=municipalities[item.id],s=stats[item.id];
  const codes=[...(s?.postals||[])];
  const shared=codes.filter(cp=>postals[cp].length>1);
  const flags=[];
  if(!m)flags.push('Entité absente du répertoire MAMH: statut territorial à examiner, aucune approbation');
  if(item.touching.length>item.shared.length)flags.push('Au moins un contact sans segment exact démontré: point ou segmentation à vérifier');
  if(!item.anchor)flags.push('Taille, accès routier et éventuelle limite aquatique à valider');
  if(shared.length)flags.push(`${shared.length} codes postaux partagés: examen au cas par cas`);
  if(!codes.length)flags.push('Aucun code postal actif associé dans la table ISQ');
  if(item.name==='Montréal')flags.push('Montréal non approuvée: ne pas assimiler à une petite municipalité');
  const category=item.anchor?'reference_approuvee':!m?'territoire_a_examiner':item.shared.length?'candidate_frontiere_partagee':'contact_topologique_incertain';
  return {code:item.id,municipalite:item.name,categorie:category,mrc:m?.mrc||byId.get(item.id)?.attributes.MUS_NM_MRC||'',
    region:m?.region||'',population_mamh:m?.population??'',villes_reference_en_contact:[...new Set(item.touching)].sort().join(' | '),
    segment_commun_demontre_avec:[...new Set(item.shared)].sort().join(' | '),
    codes_postaux_actifs:codes.length,codes_postaux_partages:shared.length,
    exemple_code_postal:s?.sample?.cp||'',latitude_exemple_cp:s?.sample?.lat??'',longitude_exemple_cp:s?.sample?.lon??'',
    decision_metier:item.anchor?'Déjà approuvée; conservée':'EN ATTENTE — ne pas activer',
    incertitudes:flags.join(' ; ')};
});
const fileHashes={};
for(const filename of ['MUN.csv','cp-territoires.csv','sda/anchors.json','sda/candidate-polygons.json']){
  fileHashes[filename]=createHash('sha256').update(fs.readFileSync(`${root}/raw/${filename}`)).digest('hex');
}
const summary={retrievedAt:evidence.retrievedAt,license:'CC BY 4.0',attribution:'Gouvernement du Québec — MAMH; MRNF; Institut de la statistique du Québec. Extraction et agrégation locale, sans approbation de couverture.',
  postalRecords:recordCount,uniquePostalCodes:Object.keys(postals).length,postalCodesSharedBetweenMunicipalities:Object.values(postals).filter(ids=>ids.length>1).length,
  municipalEntities:Object.keys(municipalities).length,anchorCount:evidence.anchors.length,
  matrixRows:rows.length,candidates:rows.filter(r=>r.categorie==='candidate_frontiere_partagee').length,
  uncertainContacts:rows.filter(r=>r.categorie==='contact_topologique_incertain').length,territoriesToReview:rows.filter(r=>r.categorie==='territoire_a_examiner').length,
  productionAdditions:0,fileHashes,
  warning:'Coordinates identify the example postal record, not a municipal centroid or a customer address. Shared segments can be water boundaries. Absence of exact segment evidence is inconclusive.',
};
const referenceVersion=createHash('sha256').update(JSON.stringify(fileHashes)).digest('hex');
summary.referenceVersion=referenceVersion;
fs.writeFileSync(`${root}/raw/postal-index.json`,JSON.stringify({version:referenceVersion,municipalities,names,postals}));
fs.writeFileSync(`${root}/municipality-matrix.json`,JSON.stringify(rows,null,2)+'\n');
fs.writeFileSync(`${root}/municipality-matrix.csv`,'\uFEFF'+[Object.keys(rows[0]).map(csvCell).join(','),...rows.map(r=>Object.values(r).map(csvCell).join(','))].join('\r\n'));
fs.writeFileSync(`${root}/summary.json`,JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(`${root}/proposed-policy.json`,JSON.stringify({validated:false,version:null,snapshotVersion:referenceVersion,approvedIds:evidence.anchors.map(a=>a.id),candidateIds:rows.filter(r=>r.categorie==='candidate_frontiere_partagee').map(r=>r.code),excludedIds:[],warning:'DRAFT: candidateIds never count as approvedIds. No production import.'},null,2)+'\n');
const escape=value=>String(value).replaceAll('|',' / ').replaceAll('\n',' ');
fs.writeFileSync(`${root}/municipality-matrix.md`,[
  '# Matrice de revue — aucune extension active',
  '', 'Sources : [MAMH](https://www.donneesquebec.ca/recherche/dataset/repertoire-des-municipalites-du-quebec), [MRNF SDA](https://www.donneesquebec.ca/recherche/dataset/decoupages-administratifs), [ISQ CP Territoires](https://www.donneesquebec.ca/recherche/dataset/cp-territoires). CC BY 4.0; extraction et rapprochement local, sans approbation des producteurs.',
  '', 'Population informative uniquement; aucun seuil. « Candidate » ne signifie jamais « couverte ». CP = code postal exact actif associé; coordonnées et incertitudes détaillées dans les fichiers CSV/JSON. Les contacts sans segment exact démontré restent indéterminés.',
  '', '| Code | Entité | Population MAMH | Catégorie | Villes avec segment commun démontré | CP actifs / partagés | Décision |',
  '| --- | --- | ---: | --- | --- | ---: | --- |',
  ...rows.map(r=>'| '+[r.code,r.municipalite,r.population_mamh,r.categorie,r.segment_commun_demontre_avec||'Non démontré',`${r.codes_postaux_actifs} / ${r.codes_postaux_partages}`,r.decision_metier].map(escape).join(' | ')+' |'),
].join('\n')+'\n');
const sampleCodes=['H2X1Y4','H7N1A1','G0A1E0','J5B0A1'];
const samplePostals=Object.fromEntries(sampleCodes.map(cp=>[cp,postals[cp]]));
const sampleIds=[...new Set(Object.values(samplePostals).flat())];
const sampleMunicipalities=Object.fromEntries(sampleIds.map(id=>[id,municipalities[id]]));
const sampleNames=Object.fromEntries(Object.entries(names).filter(([,ids])=>ids.some(id=>sampleIds.includes(id))));
fs.writeFileSync(`${root}/postal-reference-sample.json`,JSON.stringify({version:referenceVersion,
  attribution:summary.attribution,source:'ISQ CP Territoires août 2026 + MAMH extraction 20 octobre 2026; subset for offline regression tests.',
  municipalities:sampleMunicipalities,names:sampleNames,postals:samplePostals},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
