# Isolation — Demco

Projet Next.js 16 / React / TypeScript strict autonome. Aucun lien runtime vers les autres projets, aucun script de tracking publicitaire tiers et aucune donnée personnelle persistée côté navigateur.

## Commandes
`npm install`, `npm run dev` (http://127.0.0.1:3012), `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`, `npm test`.

## Architecture et fichiers
- `src/app/page.tsx` : landing `/`, besoins, confort, processus, CTA final.
- `src/app/isolation/estimation/page.tsx` : route formulaire autonome, noindex/nofollow.
- `src/app/layout.tsx`, `globals.css` : metadata, palette Isolation, styles responsive, focus et reduced motion.
- `src/data/isolation.ts` : options, couverture, étapes et contenu éditorial centralisés.
- `src/components/lead-form.tsx`, `lead-form.css` : quatre étapes, progression 25/50/75/100 %, transitions directionnelles de 280 ms, hauteur mesurée, focus et erreurs par champ.
- `src/components/brand.tsx`, `attributed-link.tsx` : identité, CTA et liens conservant l’attribution.
- `src/lib/leads.ts`, `validation.ts` : qualification, normalisation, validation et préparation du lead.
- `src/lib/attribution.ts` : transfert des paramètres autorisés entre landing et formulaire.
- `src/lib/lead-submission.ts` : contrat de réception, timeout, AbortSignal et reçu explicite.
- `tests/leads.test.mjs` : 16 tests métier et soumission spécifiques à Isolation.
- Configuration : package.json, package-lock.json, tsconfig.json, eslint.config.mjs, .gitignore et next-env.d.ts.

## Assets
Seuls `demco-logo.png`, `isolation-maison-hiver.png` et `isolation-confort-famille.png` ont été copiés depuis demco-creative-studio/public/assets vers public/assets/brand et public/assets/homes. Les deux visuels servent de contenu éditorial : aucune réalisation ou clientèle Demco n’est revendiquée. Aucune image de chantier n’est nécessaire à la composition actuelle. Utilisation et droits à confirmer avant publication. Les médias sont rendus par Next Image, avec dimensions réservées, hero préchargé et images secondaires différées.

## Qualification
Même priorité que la référence Thermopompe : hors couverture confirmée → non propriétaire → autre type de propriété → faible intention. `low_intent` correspond à « Je me renseigne pour le moment » ou au refus de contact. Les exclusions interviennent avant les coordonnées. `qualified` exige un secteur confirmé et toutes les informations valides, consentement compris. Email optionnel, validé si fourni ; téléphone obligatoire, format Canada/NANP conforme au validateur de référence (pas une vérification d’appartenance du numéro).

La couverture n’est pas confirmée : serviceCoverage.validated=false et liste vide. Le secteur reste pending ; classification=null et qualification_pending=true. Aucun code postal de fixture de test n’est utilisé en production. La présence d’une exclusion explicite reste déterminante même lorsque la géographie est inconnue.

## Attribution et privacy
source, campaign, ad, creative, utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_id, fbclid, gclid sont conservés dans les liens vers le formulaire et de retour. Paramètres autorisés limités à 500 caractères chacun, comme la référence. Les autres paramètres sont ignorés pour éviter le transfert involontaire de données. Chaque demande possède un UUID et un timestamp ISO, un consentement versionné isolation-v1 et horodaté. Un nouvel UUID est créé pour chaque nouvelle demande ; une tentative identique conserve son ID. Aucune coordonnée n’est placée dans l’URL, les logs ou le stockage local. Les réponses restent uniquement en mémoire jusqu’au rechargement ou à la fermeture.

## Soumission
Aucun backend ni CRM n’est connecté. La dernière action affiche une indisponibilité, sans faux chargement ni succès, en conservant les réponses. Pour connecter le service, implémenter leadReceiver vers un endpoint same-origin sécurisé. Le serveur devra revalider les champs, recalculer la qualification et la couverture, valider l’attribution, limiter les abus et accepter durablement la demande avant de renvoyer un statut HTTP réussi et `{accepted:true,lead_id}` correspondant. Une réponse HTTP 200 seule ne suffit pas. Timeout à 15 secondes, annulation et erreurs réseau ne peuvent jamais devenir un succès.

## Validation
Build production, lint, TypeScript strict et tests exécutés. Contrôles navigateur à 1440, 1280, 390 et 320 px sur la landing ; formulaire aux mêmes largeurs. Parcours : erreurs proches des champs, focus sur erreur et nouveau titre, navigation retour avec réponses conservées, email vide accepté, consentement obligatoire, indisponibilité sans succès, exclusion sans coordonnées. Respect de prefers-reduced-motion prévu en CSS et en navigation ; audit WCAG complet et essais sur appareils physiques à effectuer avant production.

Audit npm : aucune vulnérabilité de production. Cinq alertes élevées dans la chaîne ESLint (braces → micromatch → fast-glob → plugin/config Next) ; aucune version corrigée de braces disponible sur le registre utilisé lors de la vérification. Ne pas rétrograder automatiquement Next/sa config vers la version 14 proposée par npm audit.

Le dossier ne possède pas de dépôt Git. `git diff --check` standard est donc inapplicable ; contrôle équivalent via `git diff --no-index --check` sur les fichiers source/configuration. Aucun commit, push ou déploiement.

## Avant production
1. Confirmer les codes postaux desservis et les conditions de transmission.
2. Connecter une réception serveur sécurisée et durable, avec anti-spam, idempotence et protection des coordonnées.
3. Valider l’identité juridique de l’exploitant, les destinataires, les modalités de contact, la durée de conservation, les droits et le texte de confidentialité/consentement.
4. Confirmer les droits des assets et du logo, le domaine et les métadonnées finales.
5. Refaire la recette sur le backend réel et l’audit d’accessibilité, puis autoriser explicitement l’indexation et la publication.

## Garanties de périmètre
Thermopomp_web lu uniquement, sans modification. Isolation-web est séparé. Aucune mention de développement, d’IA ou de maquette n’est visible. Aucun avis, économie chiffrée, subvention, certification, garantie, partenaire ou réalisation attribuée n’a été inventé. Direction éditoriale ivoire chaud, forêt et terre cuite propre à Isolation. Attribution conservée jusqu’au formulaire. Aucun succès de soumission simulé.
