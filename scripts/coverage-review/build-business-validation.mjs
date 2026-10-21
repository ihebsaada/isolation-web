// Offline business review only. Never imported by the application.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const sectors = [
  ['SO', 'Sud-Ouest — Beauharnois / Roussillon', ['Beauharnois', 'Châteauguay', 'Candiac']],
  ['HR', 'Haut-Richelieu / Chambly', ['Saint-Jean-sur-Richelieu', 'Chambly']],
  ['VR', 'Vallée-du-Richelieu / Marguerite-D’Youville', ['Beloeil', 'Saint-Bruno-de-Montarville', 'Sainte-Julie', 'Varennes']],
  ['GR', 'Granby et environs', ['Granby']],
  ['SH', 'Sherbrooke et environs', ['Sherbrooke']],
  ['DR', 'Drummondville et environs', ['Drummondville']],
  ['LN', 'Laval / Laurentides', ['Laval', 'Pointe-Calumet', 'Deux-Montagnes', 'Saint-Eustache', 'Boisbriand', 'Mirabel', 'Saint-Jérôme']],
  ['LA', 'Lanaudière', ['Terrebonne', 'Repentigny', 'Joliette', 'Rawdon']],
];
// Editorial shortlist, not a population rule or proof of road access/residential use.
const priority = new Set(['67025','67055','70012','67045','70030','57010','55057','56097','56055','56065','56060','57025','57030','57020','59015','57045','55065','55008','47010','55015','47055','47047','41055','42025','42005','42020','49070','49048','49095','49040','73030','73025','73020','72015','72025','61030','61035','61005','61027','60005','60020','63065','62030']);
// Named review buckets, deliberately no numerical population threshold.
const urban = new Set(['66023','58227','58033','73015','64015','70052','45072','67035','67015','60028','73010']);

export function buildGroups(rows) {
  const groups = [];
  const add = (id, label, recommendation, members, reason) => {
    if (members.length) groups.push({id, label, recommendation, decision_client: 'vérifier', validated: false, reason, members});
  };
  const refs = r => r.villes_reference_en_contact.split(' | ');
  const regular = rows.filter(r => r.categorie === 'candidate_frontiere_partagee' && !urban.has(r.code) && r.code !== '67802' && r.code !== '71065');
  for (const [id, label, anchors] of sectors) {
    // First matching sector is the sole decision owner; all associations remain in members and appendix.
    const members = regular.filter(r => sectors.find(s => refs(r).some(a => s[2].includes(a)))?.[0] === id);
    add(`${id}-A`, `${label} — première extension proposée`, 'approuver', members.filter(r => priority.has(r.code)), 'Sélection éditoriale de voisines à examiner en premier pour la desserte résidentielle. Ni usage résidentiel, ni trajet, ni capacité opérationnelle certifiés.');
    add(`${id}-B`, `${label} — complément`, 'vérifier', members.filter(r => !priority.has(r.code)), 'Extension complémentaire : faire confirmer la desserte du lot par DEMCO, sans seuil de population ni rayon.');
    if (!anchors.length) throw new Error('Missing anchors');
  }
  add('URB', 'Grandes villes et pôles urbains — décision explicite', 'vérifier', rows.filter(r => urban.has(r.code)), 'Montréal et Longueuil ne sont pas assimilées aux petites municipalités. Les autres pôles sont regroupés pour une décision commerciale explicite, sans classement automatique par population.');
  add('EAU', 'Contact à examiner séparément — Notre-Dame-de-l’Île-Perrot', 'vérifier', rows.filter(r => r.code === '71065'), 'La contiguïté avec Beauharnois ne démontre pas une desserte routière. Nature de la limite et trajet à confirmer; aucun contact terrestre ou aquatique affirmé ici.');
  add('TOP', 'Brossard — topologie incertaine et grande ville', 'vérifier', rows.filter(r => r.categorie === 'contact_topologique_incertain'), 'Contact avec Saint-Jean-sur-Richelieu sans segment exact démontré. Ne pas conclure à un contact terrestre, aquatique ou ponctuel avant contrôle.');
  add('TER', 'Territoires habités à examiner séparément', 'vérifier', rows.filter(r => ['67802','72802'].includes(r.code)), 'Kahnawake et Kanesatake : confirmer le périmètre de desserte et les modalités opérationnelles; aucune exclusion fondée sur la population ou ses caractéristiques.');
  add('TNO-EAU', 'TNO aquatiques — hors première extension résidentielle', 'exclure', rows.filter(r => r.municipalite.startsWith('TNO aquatique')), 'Proposition d’exclusion du périmètre résidentiel de première extension, sans rejeter un prospect à partir d’une coordonnée postale approximative.');
  add('TNO-TER', 'TNO terrestre — périmètre à préciser', 'vérifier', rows.filter(r => r.municipalite.startsWith('TNO terrestre')), 'Absence de code postal actif associé dans la matrice; statut et adresse de projet à examiner.');
  const expected = rows.filter(r => r.categorie !== 'reference_approuvee');
  const ids = groups.flatMap(g => g.members.map(r => r.code));
  if (ids.length !== expected.length || new Set(ids).size !== ids.length || expected.some(r => !ids.includes(r.code))) throw new Error('Incomplete or overlapping groups');
  return groups;
}

export function renderReview(rows, groups) {
  const lines = ['# DEMCO — proposition de validation par lots', '',
    'Document de préparation uniquement. Les 23 références existantes sont conservées, dont Terrebonne, Repentigny et Joliette. Aucune candidate supplémentaire n’est activée. Les recommandations ci-dessous ne constituent pas une approbation client.', '',
    '## Décider sans relire le CSV', '',
    'Répondre par identifiant de lot avec **approuver**, **exclure** ou **vérifier**. Exemple : « SO-A : approuver; SO-B : vérifier ». Une exception peut être nommée sans revoir les autres lignes. Une approbation valide uniquement la liste nommée : ni voisines récursives, ni rayon, ni préfixe postal. Tous les lots restent actuellement à vérifier.', '',
    'Les lots A constituent une première sélection de municipalités voisines potentiellement pertinentes pour la desserte résidentielle. C’est une proposition éditoriale à DEMCO, fondée sur la contiguïté de la matrice et le regroupement des références. Elle ne certifie pas l’usage résidentiel, les accès ou la rentabilité. Les lots B regroupent les autres voisines ordinaires. La population n’intervient jamais dans le classement; les lots urbains sont une liste explicite de points à décider.', '',
    `La matrice contient 99 candidates à frontière partagée, Brossard au contact incertain et 7 territoires particuliers. Les ${groups.length} lots ci-dessous attribuent chacune de ces 107 entités à un seul lot, même lorsqu’elle touche plusieurs références.`, ''];
  for (const g of groups) {
    lines.push(`## ${g.id} — ${g.label}`, '', `**Proposition : ${g.recommendation}. Décision client : vérifier (non validée).**`, '', g.members.map(r => r.municipalite).join(' ; ') + '.', '', g.reason, '', `Références concernées : ${[...new Set(g.members.flatMap(r => r.villes_reference_en_contact.split(' | ')))].join(' ; ')}.`, '');
  }
  lines.push('## Limites aquatiques et territoires', '',
    'Les cinq TNO explicitement aquatiques sont isolés dans TNO-EAU. Pour les municipalités ordinaires, un segment commun dans le SDA peut suivre une rivière : aucune preuve générale de continuité terrestre ou d’accès routier n’est disponible dans cette matrice. Le contrôle des accès se fait par lot avec DEMCO, puis uniquement sur ses exceptions, sans demander une revue ligne par ligne. EAU et TOP isolent deux points de vigilance; ils ne constituent pas un inventaire exhaustif des limites aquatiques. Montréal reste à vérifier, sans approbation implicite.', '',
    '## Codes postaux : proposition de traitement futur', '',
    '| Situation | Traitement proposé |', '| --- | --- |',
    '| Format canadien invalide | Demander une correction; état géographique invalid, sans en déduire une faible intention. |',
    '| Code complet lié uniquement à la municipalité approuvée | inside après validation du périmètre et de la version du référentiel. |',
    '| Code partagé et municipalité déclarée compatible | Conserver le prospect en pending, qualification_pending=true; vérifier l’adresse du projet. Ne pas exclure toute la municipalité pour ce code. |',
    '| Ville/code incompatibles, code absent ou ancien, nom ambigu | Proposer correction puis revue humaine pending si non résolu; conserver les informations saisies. Aucun rejet automatique pour incohérence seule. |',
    '| Municipalité explicitement exclue et localisation suffisamment établie | outside; conserver séparément la raison géographique. |', '',
    'Ce traitement est une proposition, pas un changement du moteur. Le prototype précédent renvoie invalid pour city_postal_mismatch : le passage à une correction puis pending devra être validé et testé avant raccordement. Les coordonnées d’exemple du CSV sont celles d’un enregistrement postal, pas celles du logement. Aucun seuil de majorité, préfixe G/H/J ou point postal ne suffit à approuver un territoire.', '',
    '## Géographie et intention', '',
    'Conserver deux résultats indépendants : géographie inside/pending/outside/invalid et intention commerciale selon les règles existantes. Une géographie pending ne signifie jamais low_intent. Tant que la vérification géographique est ouverte, qualification_pending=true et aucun événement QualifiedLead. Une couverture approuvée ne suffit pas à qualifier : propriété, type de bâtiment, intention et consentement restent nécessaires. Aucun changement de colonnes Sheets, de données historiques, d’exports ou d’événements Meta dans cette préparation.', '',
    '## Traçabilité par ville de référence', '',
    'Annexe informative : aucune décision supplémentaire requise ici. Les entités multi-références figurent dans plusieurs lignes de cette annexe mais dans un seul lot de décision.', '',
    '| Secteur | Référence conservée | Candidates / cas particuliers et lot |', '| --- | --- | --- |');
  for (const [, sector, anchors] of sectors) for (const anchor of anchors) {
    const matches = groups.flatMap(g => g.members.filter(r => r.villes_reference_en_contact.split(' | ').includes(anchor)).map(r => `${r.municipalite} (${g.id})`));
    lines.push(`| ${sector} | ${anchor} | ${matches.join(' ; ')} |`);
  }
  lines.push('', '## Décisions restantes', '',
    'Valider les lots et leurs éventuelles exceptions; confirmer la desserte routière/opérationnelle des lots retenus; valider le traitement des incohérences postales et des adresses partagées. Ensuite seulement préparer une politique versionnée distincte. Aucun lot approuvé ici, aucune couverture active modifiée, aucun push ni déploiement.', '',
    'Sources : matrice locale et preuves déjà archivées dans work/coverage-review; [MAMH](https://www.donneesquebec.ca/recherche/dataset/repertoire-des-municipalites-du-quebec), [SDA / MRNF](https://www.donneesquebec.ca/recherche/dataset/decoupages-administratifs), [ISQ — codes postaux](https://www.donneesquebec.ca/recherche/dataset/cp-territoires). Gouvernement du Québec, CC BY 4.0. Le regroupement et les recommandations sont une analyse locale, pas une décision des producteurs des données.', '');
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = JSON.parse(fs.readFileSync('work/coverage-review/municipality-matrix.json', 'utf8'));
  const groups = buildGroups(rows);
  fs.writeFileSync('work/coverage-review/business-validation-groups.json', JSON.stringify({validated:false, productionAdditions:0, groups}, null, 2) + '\n');
  fs.writeFileSync('DEMCO-SECTOR-VALIDATION.md', renderReview(rows, groups));
  console.log(`${groups.length} review groups; ${groups.flatMap(g => g.members).length} entities; no active changes`);
}
