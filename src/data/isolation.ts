export const needs = ['Grenier / combles', 'Murs', 'Sous-sol', 'Plusieurs zones', 'À déterminer'] as const;
export const timings = ['Dès que possible', 'Dans 1 à 3 mois', 'Dans 3 à 6 mois', 'Je me renseigne pour le moment'] as const;
export const steps = ['Votre secteur', 'Votre maison', 'Votre projet', 'Vos coordonnées'];
export const hooks = ['Commençons par vérifier votre secteur.', 'Quelques détails sur votre habitation.', 'Parlez-nous de votre projet d’isolation.', 'Dernière étape. Où pouvons-nous vous joindre ?'];
// Exact client-approved municipalities only. Surrounding towns require review.
export const serviceCoverage = { validated: true, cities: [
  'Beauharnois', 'Châteauguay', 'Candiac', 'Saint-Jean-sur-Richelieu', 'Granby',
  'Sherbrooke', 'Drummondville', 'Varennes', 'Beloeil', 'Sainte-Julie',
  'Saint-Bruno-de-Montarville', 'Chambly', 'Laval', 'Pointe-Calumet',
  'Deux-Montagnes', 'Saint-Eustache', 'Boisbriand', 'Mirabel', 'Saint-Jérôme',
  'Terrebonne', 'Repentigny', 'Joliette', 'Rawdon',
] as readonly string[] };
export const benefits = [ ['Un confort plus stable', 'Une isolation adaptée aide à limiter les variations de température dans les espaces de vie.'], ['Une enveloppe mieux protégée', 'Le grenier, les murs et le sous-sol participent à la protection de votre maison contre le froid et la chaleur.'], ['Moins de pertes thermiques', 'Améliorer l’isolation permet de limiter les échanges de chaleur à travers l’enveloppe du bâtiment.'] ];
export const process = ['Vous décrivez votre projet.', 'Nous vérifions votre secteur et votre besoin.', 'Votre demande peut être transmise pour estimation.'];
