'use client';

export function AdvertisingPreferencesLink() {
  return <a className="advertising-preferences-link" href="#preferences-publicitaires" onClick={event => {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('open-advertising-preferences', { detail: event.currentTarget }));
  }}>Confidentialité · Paramètres publicitaires</a>;
}
