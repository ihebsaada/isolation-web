import { Brand } from './brand';

export function SiteFooter() {
  return <footer className="footer wrap">
    <Brand/>
    <nav className="footer-links" aria-label="Informations et confidentialité">
      <a href="/confidentialite">Confidentialité</a>
      <a href="/confidentialite#preferences-publicitaires">Préférences publicitaires</a>
    </nav>
    <span>Isolation résidentielle</span>
  </footer>;
}
