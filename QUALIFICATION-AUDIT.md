# Audit et correction de la qualification — 20 octobre 2026

Branche locale : `fix/qualification-pending-audit`. Aucun commit/push, déploiement, changement Vercel/Meta ou accès en écriture à une Sheet réelle. Le statut `pending — À vérifier` a été validé explicitement par l’utilisateur pendant cette mission.

## 1. Cause racine et diagnostic du cas Montréal

`src/lib/service-area.ts`, `coverageStatus()` : Montréal ne figure pas dans les 23 villes approuvées. Avec un code H2X1Y4 valide, le secteur reste `pending`. C’est le comportement commercial attendu, inchangé.

`src/lib/leads.ts`, `classify()` : après les exclusions et le contrôle d’intention, un secteur autre que `inside` renvoie `null`. Pour une soumission complète et valide, ce `null` signifie que le secteur est à confirmer ; il ne signifie pas une faible intention.

**Erreur dans `src/lib/lead-record.ts`, `makeRecord()` :** l’ancienne condition `lead.classification === 'low_intent' || lead.classification === null ? 'low_intent' : ...` associait l’attente à une faible intention. `buildLead()` conservait séparément `qualification_pending=true`. L’API transmettait donc `low_intent` et `true` à Apps Script, qui les enregistrait sans recalculer la qualification.

Pour le prospect fourni : propriétaire oui, maison individuelle oui, Sous-sol, Dès que possible, intention oui. Aucun défaut de comparaison sur ces valeurs canoniques n’explique l’anomalie. Le seul motif d’attente est Montréal non approuvée. Résultat corrigé pour une nouvelle soumission : **`pending`, `qualification_pending=true`, `call_status=new`**. Aucun `QualifiedLead`. Le prospect existant n’a pas été modifié.

La représentation précédente suivait le mapping historique ; elle était sémantiquement trompeuse pour le centre d’appel. La correction ne modifie ni la liste de couverture ni les conditions d’admissibilité.

## 2. Flux vérifié

Formulaire (`src/components/lead-form.tsx`) → `validateStep()` et `firstInvalidField()` → normalisation commune → `classify()` / `buildLead()` → `submitLead()` → POST `/api/leads` → validation serveur complète et recalcul dans `makeRecord()` → `sheet('append')` → Apps Script avec token, verrou et dédoublonnage par `lead_id` → colonnes Sheets → reçu explicite confirmé → `trackReceipt()`.

Le serveur ignore la classification et le statut proposés par le navigateur. `call_status` est toujours initialisé à `new`; un appel/rendez-vous ne change pas la qualification. Une erreur de persistance ou un reçu incohérent ne confirme pas l’envoi. Les événements de conversion ne sont appelés qu’après le reçu confirmé.

## 3. Corrections locales

| Fichier | Modification / justification |
| --- | --- |
| `src/lib/qualification-status.ts` (nouveau) | Liste canonique des quatre statuts et mapping explicite de `null` vers `pending`, utilisé après validation complète. |
| `src/lib/project-normalization.ts` (nouveau) | Réponses oui/yes/true/boolean et non/no/false/boolean normalisées; casse/accents/espaces normalisés pour retrouver une option déjà existante. Aucun choix métier supplémentaire. |
| `src/lib/leads.ts` | Normalisation partagée pour qualification, validation et payload; consentement strictement booléen; pending signifie secteur à confirmer, pas formulaire incomplet. |
| `src/lib/validation.ts` | Même normalisation pour le focus du premier champ invalide; consentement explicite conservé. |
| `src/lib/lead-record.ts` | Validation des entrées brutes avant normalisation, mapping corrigé, aucune valeur inconnue promue en réponse positive. |
| `src/lib/lead-server.ts` | Accepte le statut pending dans un reçu; rejette pending/false, qualified/true ou des flags de reçu invalides. |
| `scripts/google-apps-script.gs` | Accepte pending, vérifie les flags; conserve les noms/l’ordre des colonnes, les verrous, les anciens statuts et les identifiants. |
| `src/app/leads/viewer.tsx` | Filtre pending et libellé « À vérifier »; aucune modification d’authentification ni ajout de commande de requalification. |
| `src/lib/call-center-export.ts` | Libellé pending dans le CSV centre d’appels. CSV technique et colonnes inchangés. |
| `tests/qualification-audit.test.mjs` (nouveau) | Régression Montréal, normalisation, inconnus/manquants, consentement, exports/historique, Meta. |
| `tests/apps-script.test.mjs` | Simulation Apps Script : mêmes colonnes/statuts, écriture pending, retry sans doublon, anciennes lignes inchangées, incohérences rejetées. |
| `tests/lead-routes.test.mjs` | Vraies fonctions API/serveur avec transport Google simulé : soumission Montréal, validation, reçu, lecture/filtre, deux exports, appels/notes et échecs. Complète le contexte de test Node pour les globals nécessaires à POST. |
| `tests/lead-record.test.mjs`, `tests/service-area.test.mjs` | Attentes mises à jour : inconnue géographique → pending, pas low_intent. |

Les villes, la chaîne saisie pour l’identité/localisation et les informations d’attribution restent disponibles selon le schéma existant. La normalisation est pure : l’objet fourni n’est pas muté. Les réponses équivalentes et options sont persistées dans leurs valeurs canoniques; aucune nouvelle archive de variantes brutes ni journalisation de données personnelles n’est créée. Les anciennes lignes restent une source d’audit inchangée. Le schéma actuel ne conserve pas une preuve exhaustive des interactions navigateur.

## 4. Matrice de qualification réellement appliquée

Toutes les lignes ci-dessous concernant une écriture supposent que les champs obligatoires et le consentement sont valides.

| Situation | Statut persisté | qualification_pending | Meta après persistance |
| --- | --- | --- | --- |
| Ville approuvée, propriétaire, maison individuelle, besoin/options valides, demande de contact et délai parmi les trois délais de travaux | qualified | false | Lead + QualifiedLead |
| Secteur Québec non confirmé, mêmes réponses favorables, dont Montréal | pending | true | Lead uniquement |
| « Je me renseigne pour le moment » ou refus de contact, secteur approuvé | low_intent | false | Lead uniquement si soumission complète reçue |
| Intention explicitement faible et secteur inconnu | low_intent | true | Lead uniquement si soumission complète reçue |
| Non-propriétaire, propriété non admissible ou hors secteur selon la règle existante | rejected | false | Lead uniquement si soumission complète reçue |
| Champ absent/inconnu/invalide, consentement absent/faux/non booléen | Pas de ligne : erreur 400 | Sans objet | Aucun |

Le funnel public conserve ses sorties anticipées : les visiteurs non admissibles ou à faible intention terminent avant la collecte des coordonnées; ils ne sont donc pas automatiquement persistés ni suivis comme leads. La matrice décrit aussi la défense serveur pour une requête complète reçue directement.

Le flag pending est un axe indépendant : le secteur mérite une confirmation tant qu’il est inconnu et que l’éligibilité n’est pas déjà rejetée. Une intention explicitement négative reste faible même si le secteur est à vérifier. L’application ne permet pas de lever ce flag via un simple changement de statut d’appel; aucune requalification automatique n’a été ajoutée.

Couverture inchangée : seulement les 23 villes approuvées qualifient. Une municipalité non listée avec un code G/H/J reste en attente, sans supposer sa proximité. Un code manifestement extérieur au Québec et une ville non approuvée donnent out_of_area. Ce filtre ne valide pas la cohérence réelle entre ville et code postal et ne remplace pas une vérification humaine.

## 5. Tests et sécurité

- `npm.cmd test` : **68/68 PASS**, dont les nouvelles régressions et les tests existants.
- `npm.cmd run lint` : **PASS**, aucune erreur ni avertissement ESLint.
- `npm.cmd run typecheck` : **PASS**.
- `npm.cmd run build` : **PASS**.
- `node scripts/check-seo.mjs` : **PASS**, vérification locale du rendu public, accès privé/API et SEO inchangés.
- Tests : données exclusivement synthétiques; Google/Apps Script simulés. Aucune vraie soumission, modification ou suppression dans Google Sheets.
- Deux échecs de développement des tests ont été corrigés : expression de vérification de la case de consentement trop restrictive autour de la flèche JSX, puis globals Web absents du contexte VM des nouvelles requêtes POST. Ce n’étaient pas des changements des règles métier. La suite finale est intégralement verte.
- Contrôle des secrets dans les sources et bundles navigateur : valeurs réelles non affichées, aucune exposition trouvée. `.env.local` reste ignoré.

## 6. Compatibilité et historique

Aucune colonne ajoutée, supprimée ou déplacée. Ajout d’une **valeur** de qualification dans une colonne existante. Le CSV technique conserve la valeur machine; le CSV opérateur affiche « À vérifier ». Les lecteurs connus prennent en charge les quatre statuts; les valeurs historiques sont conservées. Il faut vérifier tout éventuel outil externe non présent dans ce dépôt qui aurait une liste fermée de trois statuts.

Le script livré doit accepter pending avant qu’une version de l’application qui envoie pending soit autorisée en production. Le script actuellement publié n’a pas été changé : s’il est resté à l’ancien code à trois statuts, il rejetterait les nouvelles soumissions pending. Cette dépendance doit être validée lors d’une future recette contrôlée. Aucun contournement par faux succès n’est ajouté.

Les retries gardent l’identifiant du formulaire inchangé et retournent la ligne déjà existante; ils ne corrigent pas rétroactivement son ancien statut. Aucune migration, édition de vraie donnée ou promotion d’un ancien low_intent n’a été effectuée.

Meta : code Pixel/IDs inchangés. pending ne déclenche jamais QualifiedLead. Déclenchement après persistance, eventID et dédoublonnage par session conservés. Sans sessionStorage, la protection entre remontages reste best-effort comme auparavant; la protection contre double-clic et le dédoublonnage Sheet restent présents.

## 7. Consentement et limites de conformité

Source examinée : case initialement non cochée, obligatoire, texte exact « J’accepte d’être contacté par téléphone au sujet de ma demande d’isolation. » Le pied de page explique l’examen du projet et le contact avec accord. Le serveur n’accepte pas une chaîne `"true"` ou `"yes"` comme consentement. Une valeur API `true` ne prouve toutefois pas seule une action humaine ni l’affichage effectif du texte au moment de la soumission historique.

Le payload contient une version, un but et une date de consentement, mais la Sheet actuelle n’enregistre que le booléen. Le schéma n’a pas été enrichi sans validation. Le texte/identité du responsable, le cadre de transmission au centre d’appel, la conservation des preuves et les éventuelles réutilisations doivent être confirmés par le responsable métier; le code ne prétend pas les autoriser.

Les [conditions officielles Meta](https://www.facebook.com/legal/leadgen/tos/) ont redirigé vers une connexion/limitation d’accès pendant l’audit : les clauses A à G de la version du 10 octobre 2025 n’ont pas pu être vérifiées intégralement. Aucune certification juridique de conformité n’est donnée. Aucun changement de finalité, destinataire, partage ou consentement n’est exécuté.

## 8. Verdict

**GO pour revue technique locale** : cause reproduite et corrigée, statut pending validé par l’utilisateur, 68 tests verts, schéma et règles d’éligibilité conservés.

**NO-GO pour publication immédiate** : nouvelle version Apps Script et application à valider ensemble dans une recette autorisée, prise en charge des lecteurs externes à confirmer, éléments de consentement/transmission à faire valider. Aucun service réel n’a été changé. Attendre la validation de l’utilisateur avant tout push/publication.
