export function PrivacyNotice() {
  return <p className="fine-print privacy-summary">TechVoice reçoit et qualifie votre demande et peut vous rappeler au sujet de votre estimation. Les informations pertinentes peuvent être transmises à DEMCO, prestataire d’isolation. <a href="/confidentialite">Consulter la notice de confidentialité</a>.</p>;
}

export function FullPrivacyNotice() {
  return <>
    <section aria-labelledby="privacy-purpose"><h2 id="privacy-purpose">Votre demande d’estimation</h2>
    <p>Votre demande sert à examiner votre projet d’isolation, vérifier votre secteur et préparer le suivi de votre estimation.</p>
    </section>
    <section aria-labelledby="privacy-actors"><h2 id="privacy-actors">Les intervenants et leurs rôles</h2>
    <ul>
      <li>Nest Studio intervient uniquement comme prestataire de développement web et de gestion des campagnes publicitaires, sans exploitation commerciale des prospects.</li>
      <li>TechVoice reçoit, contacte et qualifie les prospects. Avec votre accord, son centre d’appel peut vous contacter par téléphone concernant votre estimation.</li>
      <li>DEMCO est le client final de TechVoice et le prestataire d’isolation. Il utilise les demandes et leurs informations pertinentes pour les estimations et les prestations d’isolation.</li>
    </ul>
    <p>TechVoice et DEMCO partagent la gestion opérationnelle des prospects. Cette répartition ne constitue pas une déclaration de responsabilité juridique conjointe : les responsabilités juridiques restent à valider par les entreprises.</p>
    </section>
    <section aria-labelledby="privacy-data"><h2 id="privacy-data">Les informations recueillies</h2>
    <p>Le formulaire demande votre nom, votre téléphone, votre ville, votre code postal et des précisions sur votre habitation et votre projet. Le courriel est facultatif. Votre accord est demandé au moyen d’une case non précochée. Sans cet accord, la demande de rappel n’est pas envoyée.</p>
    <p>La demande comprend aussi la date de réception, un identifiant, le résultat de qualification et, lorsqu’ils sont disponibles, la provenance de la visite et les identifiants publicitaires présents dans le lien. Google Sheets sert à enregistrer les demandes; le site utilise Vercel. Ces informations ne constituent pas une inscription à une infolettre.</p>
    </section>
    <section aria-labelledby="privacy-sharing"><h2 id="privacy-sharing">Utilisation et transmission des données</h2>
      <p>TechVoice reçoit votre demande pour vous contacter et qualifier votre projet. Les informations pertinentes sont destinées à DEMCO pour préparer votre estimation et donner suite aux prestations d’isolation. TechVoice et DEMCO partagent ce suivi opérationnel. Nest Studio n’exploite pas commercialement les prospects.</p>
      <p>L’envoi de la demande nécessite votre accord au rappel et à la transmission décrite dans le formulaire. Cet accord n’inscrit pas à une infolettre et reste distinct de votre choix publicitaire.</p>
    </section>
    <section aria-labelledby="privacy-retention"><h2 id="privacy-retention">Conservation et sécurité</h2>
      <p><strong>Proposition à faire approuver par TechVoice et DEMCO :</strong> conserver les demandes pendant six mois après le dernier suivi, puis appliquer les règles de suppression ou d’anonymisation convenues. Cette durée n’est pas encore validée et aucune suppression automatique fondée sur cette proposition n’est mise en place.</p>
      <p>L’accès au suivi des demandes est protégé par un code d’accès et une session. Les accès autorisés de chaque intervenant, les lieux de traitement et les règles définitives de conservation et de destruction restent à confirmer. Aucune localisation d’hébergement ni garantie de sécurité absolue n’est affirmée.</p>
    </section>
    <section aria-labelledby="privacy-rights"><h2 id="privacy-rights">Exercice des droits et contact</h2>
      <p>Pour toute question concernant le site ou pour transmettre une demande relative à vos données personnelles (accès, rectification, retrait de consentement ou plainte), écrivez à <a href="mailto:contact@neststudio.tn">contact@neststudio.tn</a>.</p>
      <p>Nest Studio constitue le point de réception et d’orientation de ces demandes vers TechVoice et DEMCO, selon le partenaire autorisé à les traiter. Ce rôle de réception ne désigne pas Nest Studio comme responsable juridique des données. Les responsabilités légales et les modalités de traitement des demandes restent à valider par les entreprises.</p>
    </section>
    <section aria-labelledby="privacy-consent"><h2 id="privacy-consent">Suivi publicitaire Meta</h2>
    <p>Le consentement au rappel concerne votre demande d’estimation. Il ne vaut pas accord au suivi publicitaire Meta.</p>
    <p>Lorsque le suivi publicitaire est disponible, vous pouvez l’accepter ou le refuser séparément, puis modifier ce choix dans les préférences publicitaires. En cas d’acceptation, Meta peut recevoir des informations sur les pages consultées, les événements de demande, les identifiants de navigateur et des données techniques de connexion pour mesurer les publicités. Aucun chargement du Pixel n’a lieu avant acceptation; le refus n’empêche pas l’envoi de votre demande. Le choix est conservé pour la session de cet onglet. Le retrait arrête les prochains événements du site, sans effacer les données déjà transmises.</p>
    <a href="#preferences-publicitaires">Gérer mes préférences publicitaires</a>
    </section>
    <section className="privacy-validation" aria-labelledby="privacy-validation"><h2 id="privacy-validation">Informations en cours de validation</h2>
      <p>Les rôles ci-dessus sont opérationnels. Les informations juridiques suivantes restent à compléter avant validation de cette notice.</p>
      <dl>
        <dt>Dénominations légales et coordonnées des trois intervenants</dt><dd>À compléter et valider.</dd>
        <dt>Organisme responsable de la collecte et répartition des responsabilités juridiques</dt><dd>À confirmer.</dd>
        <dt>Titre et coordonnées du responsable de la protection des renseignements</dt><dd>À compléter.</dd>
        <dt>Accès, rectification, retrait de consentement et plaintes</dt><dd>Réception : contact@neststudio.tn. Interlocuteurs autorisés chez TechVoice et DEMCO, acheminement effectif et modalités de traitement à confirmer.</dd>
        <dt>Conservation et destruction</dt><dd>Proposition : six mois après le dernier suivi, à approuver par TechVoice et DEMCO; règles définitives et mise en œuvre à confirmer.</dd>
        <dt>Accès des intervenants et lieux de traitement ou d’hébergement</dt><dd>Modalités réelles et prestataires à confirmer.</dd>
      </dl>
    </section>
  </>;
}
