import { Brand } from './brand';
import { AdvertisingPreferencesLink } from './advertising-preferences-link';

export function SiteFooter() {
  return <footer className="footer wrap">
    <Brand/>
    <nav className="footer-links" aria-label="Informations et confidentialité">
      <AdvertisingPreferencesLink/>
    </nav>
    <span>Isolation résidentielle</span>
  </footer>;
}
