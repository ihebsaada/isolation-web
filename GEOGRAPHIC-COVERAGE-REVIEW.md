# Couverture géographique — proposition hors production

État au 20 octobre 2026. Branche : `fix/qualification-pending-audit`. **Aucune extension active, aucun push ni déploiement.** Les modifications de qualification en attente et les modifications préexistantes de `service-area.ts` ont été conservées. Cette mission ajoute seulement des outils de préparation, des références/matrices et des tests; aucun module du prototype n’est importé par `src/`.

## Décisions déjà reçues

- Conserver Terrebonne, Repentigny et Joliette : les **23 villes** existantes restent les références, malgré leur omission dans la dernière liste à 20 villes.
- Préparer les voisines directes comme **candidates à valider**, sans approuver automatiquement leur couverture.
- Aucun rayon, distance maximale, seuil de population ou nombre de municipalités à inclure n’a été inventé.

## 1. Audit du moteur actif

`src/data/isolation.ts` contient toujours les 23 villes approuvées. `src/lib/service-area.ts` valide la syntaxe du code postal, normalise le nom puis accepte une ville figurant exactement dans la liste. Une ville non listée avec G/H/J reste pending; une ville non listée avec un autre premier caractère valide est outside.

Limite importante : le moteur actif ne vérifie pas la correspondance ville/code postal. Par exemple, Laval + H2X1Y4 peut actuellement passer le filtre géographique, alors que l’index ISQ rattache ce code à Montréal. **Cette faille est documentée, pas modifiée silencieusement dans le parcours actif.** Les préfixes ne constituent pas un référentiel de desserte ni une vérification d’adresse.

Les règles d’intention, le consentement, Google Sheets, les événements Meta et les lignes historiques n’ont pas été modifiés par cette mission. Les corrections locales de `pending` de la mission précédente restent présentes.

## 2. Sources retenues et licence

| Source officielle | Usage proposé | Licence / précautions |
| --- | --- | --- |
| [Répertoire MAMH](https://www.donneesquebec.ca/recherche/dataset/repertoire-des-municipalites-du-quebec) | Identifiants municipaux stables, noms, MRC, régions et population indicative | CC BY 4.0 selon métadonnées téléchargées. Le code postal de l’hôtel de ville n’est **pas** une liste de codes desservis. Les coordonnées de contact publiques n’ont pas été reprises dans les sorties de revue. |
| [Découpages administratifs MRNF / SDA 1:20 000](https://www.donneesquebec.ca/recherche/dataset/decoupages-administratifs) | Polygones et limites partagées, identification des voisines directes | CC BY 4.0 selon métadonnées téléchargées. Utilisation des coordonnées originales des polygones; pas de simplification/buffer pour décider une couverture. |
| [CP Territoires ISQ, août 2026](https://www.donneesquebec.ca/recherche/dataset/cp-territoires) | Correspondance entre code postal complet et code municipal, coordonnées des enregistrements postaux | CC BY 4.0 selon métadonnées téléchargées. Aucun abonnement/API payante nécessaire. |

L’extraction locale du fichier ISQ contient 240 822 enregistrements, 220 695 codes distincts, dont 705 associés à plusieurs municipalités. Tous les rattachements sont conservés : pas de choix automatique de la commune majoritaire.

Le [guide officiel ISQ](https://statistique.quebec.ca/fr/fichier/fichier-geolocalisation-codes-postaux-base-referentiel-quebecois-adresses.pdf) confirme la licence ouverte, les rattachements multiples et certaines limites de couverture, notamment les cases postales. Un code absent du fichier ne sera donc pas déclaré invalide simplement parce qu’il est absent. Les coordonnées sont celles des enregistrements postaux, pas une adresse de prospect ni nécessairement le centre municipal.

Attribution à conserver : Gouvernement du Québec — MAMH, MRNF et Institut de la statistique du Québec; liens ci-dessus; [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.fr); mention « extraction et agrégation locales », sans suggérer l’approbation des producteurs. Les métadonnées source et empreintes SHA-256 sont conservées pour la traçabilité. La licence des données ouvertes CP Territoires ne doit pas être confondue avec celle du [FCCP de Statistique Canada](https://www.statcan.gc.ca/fr/microdonnees/idd/inscription/section1), produit distinct soumis à une entente; ce dernier n’est pas utilisé.

## 3. Méthode déterministe proposée

1. Résoudre les 23 noms vers les codes municipaux MAMH, en exigeant une correspondance unique. Ne pas travailler sur une simple chaîne de nom susceptible d’être homonyme.
2. Interroger les polygones SDA correspondants, puis leurs contacts directs via la relation `esriSpatialRelTouches`. Cette opération de préparation utilise le service public officiel, sans données de prospects.
3. Contrôler localement les segments des polygones originaux : au moins un segment non nul identique, quel que soit son sens, constitue une preuve de limite commune sur une ligne. Aucun arrondi, rayon ou tolérance métrique n’est ajouté. Si les sommets sont découpés différemment, l’absence de segment exact ne prouve **pas** un contact ponctuel : le cas reste indéterminé.
4. Ne pas parcourir les voisines des nouvelles candidates. Le voisinage est calculé exclusivement à partir des 23 références : aucune expansion récursive de proche en proche.
5. Séparer les entités absentes du répertoire municipal, les territoires aquatiques/non organisés, les réserves/établissements et les contacts non résolus. Ne pas les transformer automatiquement en municipalités couvertes.
6. Soumettre la matrice nominative à DEMCO : « candidate » n’est jamais synonyme de « approuvée ». La population n’est qu’une aide de revue, jamais une règle automatique.
7. Après validation seulement, enregistrer une liste explicite d’identifiants approuvés/exclus et sa version, liée à l’empreinte du référentiel. Le calcul de voisinage ne doit pas étendre automatiquement la liste lors d’une mise à jour de données.

Une frontière peut être aquatique, traverser une île, ou ne pas offrir d’accès routier pratique. La simple contiguïté ne permet pas de le conclure. Ces points sont signalés à la revue au lieu d’introduire un seuil de distance ou une durée de trajet.

Documentation technique de la relation publique : [requête de couche ArcGIS](https://developers.arcgis.com/rest/services-reference/enterprise/query-map-service-layer/). Une tentative supplémentaire de filtre dimensionnel côté service n’a pas produit un résultat exploitable; elle a été écartée. La matrice finale repose sur les contacts retournés et les segments exacts vérifiés localement, sans prétendre certifier les cas non résolus.

## 4. Matrice réalisée

- [Matrice lisible — 130 entités](work/coverage-review/municipality-matrix.md)
- [CSV détaillé UTF-8 BOM](work/coverage-review/municipality-matrix.csv)
- [JSON détaillé](work/coverage-review/municipality-matrix.json)
- [Preuves des contacts SDA](work/coverage-review/adjacency-evidence.json)
- [Résumé, volumes et empreintes](work/coverage-review/summary.json)
- [Politique brouillon non validée](work/coverage-review/proposed-policy.json)

| Catégorie | Nombre | Décision actuelle |
| --- | ---: | --- |
| Villes de référence | 23 | Approbation antérieure conservée |
| Candidates avec segment commun démontré | 99 | Regroupées pour validation métier; zéro activation |
| Contact topologique non résolu | 1 | Brossard : point/segmentation à contrôler, pas de conclusion automatique |
| Territoires à examiner séparément | 7 | Kanesatake et six TNO aquatiques/terrestres; aucune approbation implicite |

Exemples de candidates : Ange-Gardien (Granby), Ascot Corner (Sherbrooke), Delson (Candiac), Carignan (Chambly/Saint-Bruno/Saint-Jean), Chertsey (Rawdon). La matrice contient aussi des villes importantes comme Montréal, Blainville ou Boucherville : **elles ne sont pas automatiquement considérées comme « petites » ni approuvées**. Montréal garde un avertissement spécifique et son absence d’approbation.

Chaque ligne inclut code municipal, nom, MRC/région, population MAMH, villes de référence en contact, preuve de segment, nombre de codes postaux actifs et partagés, un exemple de code avec ses coordonnées, décision et incertitudes. Les coordonnées de l’exemple proviennent de CP Territoires; elles ne désignent pas un centre-ville. Les sources n’ont pas la même date de référence : les écarts de code/nom entre versions doivent rester pending.

## 5. Vérification ville/code postal proposée

Le prototype isolé `scripts/coverage-review/proposed-classifier.mjs` reçoit un index local et une politique versionnée, sans accès réseau :

| Situation | Résultat du prototype |
| --- | --- |
| Syntaxe postale incorrecte ou ville manquante | invalid |
| Ville inconnue/homonyme, référence absente, code absent ou potentiellement retiré | pending |
| Code connu, mais aucun rattachement à la municipalité saisie | invalid, motif city_postal_mismatch |
| Code partagé entre municipalités, même si la ville saisie appartient aux rattachements | pending, contrôle humain conservateur |
| Politique non validée ou version du référentiel différente | pending |
| Paire cohérente et municipalité explicitement approuvée dans la politique validée | inside |
| Paire cohérente et municipalité explicitement exclue dans la politique validée | outside |
| Municipalité sans décision, y compris candidate | pending |

Ce comportement de revue évite d’appeler `outside` une municipalité seulement parce qu’elle ne figure pas encore dans une liste incomplète. La frontière commerciale finale doit être validée pour permettre des exclusions déterministes. Aucun préfixe G/H/J ne produit `inside` dans le prototype.

Un code postal complet partagé n’identifie pas un logement précis; sans adresse civique, certaines ambiguïtés ne peuvent pas être résolues. Le prototype ne collecte pas de nouvelle donnée et ne prétend pas être un validateur postal officiel.

## 6. Préparation locale, performance et reproductibilité

Outils ajoutés dans `scripts/coverage-review/` :

- `csv.mjs` : lecture CSV citée/échappée; testée sur BOM, virgules, retours à la ligne et guillemets.
- `fetch-sda.mjs` : récupération publique ponctuelle et cache des contacts/polygones SDA des 23 villes, sans appel aux services du site.
- `build-review.mjs` : rapprochement hors ligne MAMH/ISQ/SDA, matrices et index local.
- `proposed-classifier.mjs` : évaluation locale pure et preuve de segments communs; jamais importé par l’application.

Les fichiers bruts téléchargés et l’index complet restent dans `work/coverage-review/raw/`, ignoré par Git. L’index postal dérivé pèse **4 397 849 octets**. Mesure indicative sur cette machine : environ 91 ms pour charger le JSON, puis 20 ms pour 10 000 évaluations; aucun appel réseau par évaluation. Ce n’est pas une mesure de latence du site en production.

Pour régénérer depuis les fichiers locaux : `node scripts/coverage-review/build-review.mjs`. Pour rafraîchir les preuves SDA : `node scripts/coverage-review/fetch-sda.mjs` nécessite un accès réseau, uniquement à la préparation. Le cache doit être renouvelé explicitement, pas utilisé comme actualisation silencieuse d’une politique approuvée. Les fichiers bruts MAMH/ISQ sont les URL publiques listées dans les métadonnées `municipalities-metadata.json` et `cp-metadata.json`; leurs empreintes sont dans `summary.json`.

Les gros CSV ne sont pas envoyés au navigateur, pas ajoutés aux assets et pas chargés par le formulaire. Aucun paquet npm ni service payant n’a été ajouté. La version de politique est actuellement `null` et `validated=false`.

## 7. Tests et périmètre inchangé

`tests/coverage-proposal.test.mjs` ajoute dix tests : paires exactes/mismatch réel Laval-H2X1Y4, code partagé, code inconnu, homonymes, politique non validée/périmée, candidate non approuvée, exclusion explicite, aucune expansion transitive, segments/points et complétude de la matrice. Les exemples réels de référence sont un petit extrait de données publiques; aucun prospect réel n’est utilisé.

- `npm.cmd test` : **78 tests PASS**.
- `npm.cmd run lint` : **PASS**, sans avertissement ESLint.
- `npm.cmd run typecheck` : **PASS**.
- `npm.cmd run build` : **PASS**.
- Aucun import du prototype dans `src/` ni nouvelle extension de la liste active.
- `.env.local` et `work/coverage-review/raw/` ignorés; aucune donnée de prospect envoyée aux sources externes.

## 8. Décisions restantes et verdict

1. Valider les lots proposés dans [DEMCO-SECTOR-VALIDATION.md](DEMCO-SECTOR-VALIDATION.md) avec approuver/exclure/vérifier, en nommant seulement les exceptions nécessaires. La revue individuelle des 99 candidates n’est plus demandée. Aucun seuil de « petite » n’est présumé.
2. Examiner le contact Brossard et les sept territoires particuliers; vérifier les accès et limites aquatiques pertinents.
3. Valider la politique conservatrice pour les 705 codes partagés et les paires incohérentes : contrôle humain vs rejet/correction demandée. Ne pas adopter un seuil PRC_REP sans décision.
4. Valider les limites commerciales finales et la définition des exclusions. Un voisinage direct ne couvre pas nécessairement toutes les localités que DEMCO entend par « alentours ».
5. Valider les alias historiques/postaux (renvois municipaux), les rapprochements entre versions et un processus de rafraîchissement avec nouvelle revue.
6. Après ces décisions, autoriser séparément l’intégration du nouvel index dans le moteur partagé et sa recette complète, en préservant pending/Meta/Sheets. Ce branchement n’a pas été effectué.

**GO pour la revue de la méthode et de la matrice. NO-GO pour activer l’extension géographique.** Le travail reste local sur la branche existante; aucun commit, push, déploiement, changement DNS, modification Google Sheets ou activation Meta.
