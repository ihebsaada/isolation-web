'use client';
import { useEffect, useLayoutEffect, useRef, useState, type AnimationEvent } from 'react';
import { buildLead, captureAttribution, classify, emptyProject, validateStep, needs, timings, qualificationMessage, type Project } from '@/lib/leads';
import { leadReceiver, submitLead, type LeadPayload } from '@/lib/lead-submission';
import './lead-form.css';
import { steps, hooks } from '@/data/isolation';
import { firstInvalidField } from '@/lib/validation';
import { trackReceipt } from '@/lib/meta';
import { contactConsentText } from '@/data/privacy';
import { PrivacyNotice } from '@/components/privacy-notice';





type View = { step: number; outcome: 'excluded' | 'success' | null; lead: LeadPayload | null };
type Phase = 'idle' | 'exit-forward' | 'exit-backward' | 'enter-forward' | 'enter-backward' | 'success-exit' | 'success-enter';
function Choice({ legend, value, options, onChange, error }: { error?: string | null; legend: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <fieldset aria-invalid={!!error || undefined}><legend>{legend}</legend><div className="choices">{options.map(([key, label]) => <label className={value === key ? 'choice selected' : 'choice'} key={key}><input type="radio" name={legend.replace(/\s/g, '-')} value={key} checked={value === key} onChange={() => onChange(key)} />{label}</label>)}</div>{error && <p className="inline-error">{error}</p>}</fieldset>;
}
export function LeadForm({ variant = 'embedded' }: { variant?: 'embedded' | 'standalone' }) {
  const [view, setView] = useState<View>({ step: 0, outcome: null, lead: null });
  const [phase, setPhase] = useState<Phase>('idle');
  const [progressStep, setProgressStep] = useState(0);
  const [project, setProject] = useState<Project>(emptyProject);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorHeading = useRef<HTMLParagraphElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const destination = useRef<View | null>(null);
  const direction = useRef<'forward' | 'backward'>('forward');
  const focusPending = useRef(false);
  const locked = useRef(false);
  const attribution = useRef(captureAttribution(''));
  const request = useRef<AbortController | null>(null);
  const pendingLead = useRef<LeadPayload | null>(null);
  const mounted = useRef(true);
  const honeypot = useRef<HTMLInputElement>(null);
  const invalidField = error ? firstInvalidField(view.step, project) : null;
  const fieldError = (key: keyof Project) => invalidField === key ? <span className="inline-error" id={`${key}-error`}>{error}</span> : null;
  const invalidProps = (key: keyof Project) => ({'aria-invalid': invalidField === key || undefined, 'aria-describedby': invalidField === key ? `${key}-error` : undefined});
  const step = view.step;
  const moving = phase !== 'idle';
  const Heading = variant === 'standalone' ? 'h2' : 'h3';
  useEffect(() => {
    mounted.current = true;
    attribution.current = captureAttribution(window.location.search);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduce = () => {
      if (preference.matches && destination.current) {
        setView(destination.current); destination.current = null;
        setPhase('idle'); locked.current = false;
      }
    };
    preference.addEventListener('change', reduce);
    return () => { mounted.current = false; request.current?.abort(); preference.removeEventListener('change', reduce); };
  }, []);
  useLayoutEffect(() => {
    const element = stage.current, container = frame.current;
    if (!element || !container) return;
    const measure = () => { container.style.height = `${element.getBoundingClientRect().height + 12}px`; };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (phase !== 'idle' || !focusPending.current) return;
    focusPending.current = false;
    heading.current?.focus({ preventScroll: true });
    const rect = heading.current?.getBoundingClientRect();
    if (rect && (rect.top < 0 || rect.bottom > window.innerHeight)) heading.current?.scrollIntoView({ block: 'nearest' });
  }, [phase, view]);
  useEffect(() => { if (error) errorHeading.current?.focus(); }, [error]);
  const navigate = (next: View, way: 'forward' | 'backward') => {
    if (locked.current) return;
    locked.current = true; focusPending.current = true;
    setError(null); setProgressStep(next.step);
    direction.current = way; destination.current = next;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setView(next); destination.current = null; setPhase('idle'); locked.current = false;
    } else setPhase(next.outcome === 'success' ? 'success-exit' : `exit-${way}`);
  };
  const animationFinished = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (phase.startsWith('exit') || phase === 'success-exit') {
      const next = destination.current;
      if (!next) return;
      setView(next);
      setPhase(next.outcome === 'success' ? 'success-enter' : `enter-${direction.current}`);
    } else {
      destination.current = null; setPhase('idle'); locked.current = false;
    }
  };
  const update = <K extends keyof Project>(key: K, value: Project[K]) => {
    setProject(p => ({ ...p, [key]: value })); setError(null); pendingLead.current = null;
  };
  const submit = async () => {
    let saved = {};
    try { saved = JSON.parse(sessionStorage.getItem('lead-attribution') || '{}'); } catch {}
    const payload = pendingLead.current ?? {...buildLead(project, attribution.current), ...saved, website:honeypot.current?.value || '', landing_path:(saved as {landing_path?:string}).landing_path || location.pathname, referrer:(saved as {referrer?:string}).referrer || document.referrer.slice(0,500)};
    pendingLead.current = payload;
    // No fake loading or successful receipt when no real receiver is configured.
    if (!leadReceiver) {
      setError('L’envoi n’est pas disponible pour le moment. Veuillez réessayer plus tard.');
      return;
    }
    locked.current = true; setLoading(true);
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const receipt = await submitLead(payload, controller.signal);
      trackReceipt(receipt.lead_id, receipt.qualification_status);
      if (!mounted.current) return;
      locked.current = false; setLoading(false);
      navigate({ step: 3, outcome: 'success', lead: payload }, 'forward');
    } catch {
      if (mounted.current) setError('Nous n’avons pas pu confirmer l’envoi. Vos réponses sont conservées sur cette page. Veuillez réessayer.');
    } finally {
      clearTimeout(timeout); request.current = null;
      if (mounted.current) { setLoading(false); if (!destination.current) locked.current = false; }
    }
  };
  const next = () => {
    if (locked.current) return;
    const message = validateStep(step, project);
    if (message) {
      if (message === error) errorHeading.current?.focus();
      else setError(message);
      return;
    }
    const classification = classify(project);
    const excluded = (step === 0 && classification === 'out_of_area') || (step === 1 && (classification === 'unqualified_owner' || classification === 'unqualified_property_type')) || (step === 2 && classification === 'low_intent');
    if (excluded) navigate({ step, outcome: 'excluded', lead: buildLead({ ...project, name: '', phone: '', email: '', consent: false }, attribution.current) }, 'forward');
    else if (step < 3) navigate({ step: step + 1, outcome: null, lead: null }, 'forward');
    else void submit();
  };
  const yesNo: [string, string][] = [['oui', 'Oui'], ['non', 'Non']];
  return <div className="form-panel lead-form-panel">
    {!view.outcome && <><div className="form-progress" aria-live="polite" aria-atomic="true"><span>Étape {progressStep + 1} sur 4</span><span>{steps[progressStep]}</span></div><div className="progress-track" role="progressbar" aria-label="Progression de votre demande" aria-valuemin={0} aria-valuemax={4} aria-valuenow={progressStep + 1} aria-valuetext={`Étape ${progressStep + 1} sur 4`}><span style={{ width: `${(progressStep + 1) * 25}%` }} /></div></>}
    <div ref={frame} className="lead-form-height"><div ref={stage} className={`lead-form-stage phase-${phase}`} onAnimationEnd={animationFinished} inert={moving || undefined}>
      {view.outcome && view.lead ? <div className="result"><span className={`result-icon ${view.outcome === 'excluded' ? 'neutral' : ''}`} aria-hidden="true">{view.outcome === 'success' ? '✓' : '—'}</span><Heading tabIndex={-1} ref={heading}>{view.outcome === 'success' ? 'Votre demande a bien été reçue.' : 'Merci pour ces précisions.'}</Heading><p>{view.outcome === 'success' ? 'Vous pourrez être contacté au sujet de votre estimation.' : qualificationMessage(view.lead.classification)}</p>{view.outcome === 'excluded' && <button className="button" onClick={() => navigate({ step: 0, outcome: null, lead: null }, 'backward')}>Modifier mes réponses <span aria-hidden="true">→</span></button>}</div> : <>
      <Heading ref={heading} tabIndex={-1}>{hooks[step]}</Heading>
      <form onSubmit={e => { e.preventDefault(); next(); }} noValidate aria-busy={loading} aria-describedby={error ? 'form-error' : undefined}><div hidden aria-hidden="true"><label>Website<input ref={honeypot} name="website" autoComplete="off" tabIndex={-1}/></label></div><fieldset className="form-fields" disabled={loading || moving}><legend className="sr-only">{steps[step]}</legend>
        {step === 0 && <><p>Indiquez où se trouve votre maison. Votre secteur sera vérifié avant toute transmission.</p><label className="field">Ville<input autoComplete="address-level2" {...invalidProps('city')} value={project.city} maxLength={100} onChange={e => update('city', e.target.value)} placeholder="Votre ville" required />{fieldError('city')}</label><label className="field">Code postal<input autoComplete="postal-code" {...invalidProps('postalCode')} value={project.postalCode} maxLength={7} onChange={e => update('postalCode', e.target.value)} placeholder="Ex. : H2X 1Y4" required />{fieldError('postalCode')}</label><p className="fine-print">Vérification du secteur par code postal.</p></>}
        {step === 1 && <><Choice legend="Êtes-vous propriétaire ?" error={invalidField === 'owner' ? error : null} value={project.owner} options={yesNo} onChange={v => update('owner', v)} /><Choice legend="S’agit-il d’une maison individuelle ?" error={invalidField === 'detached' ? error : null} value={project.detached} options={yesNo} onChange={v => update('detached', v)} />{(project.owner === 'non' || project.detached === 'non') && <p className="notice">Cette demande s’adresse aux propriétaires de maisons individuelles. Aucune coordonnée ne vous sera demandée si votre situation ne correspond pas à ces critères.</p>}</>}
        {step === 2 && <><Choice legend="Quelle partie de la maison souhaitez-vous améliorer ?" error={invalidField === 'need' ? error : null} value={project.need} options={needs.map(v => [v, v])} onChange={v => update('need', v)} /><label className="field">Quand envisagez-vous les travaux ?<select {...invalidProps('timing')} value={project.timing} onChange={e => update('timing', e.target.value)} required><option value="">Choisir un délai</option>{timings.map(v => <option key={v} value={v}>{v}</option>)}</select>{fieldError('timing')}</label><Choice legend="Souhaitez-vous être contacté au sujet de votre estimation ?" error={invalidField === 'estimate' ? error : null} value={project.estimate} options={yesNo} onChange={v => update('estimate', v)} /></>}
        {step === 3 && <><label className="field">Nom<input autoComplete="name" {...invalidProps('name')} value={project.name} maxLength={100} onChange={e => update('name', e.target.value)} required />{fieldError('name')}</label><label className="field">Téléphone<input type="tel" autoComplete="tel" placeholder="514 555-0123" {...invalidProps('phone')} value={project.phone} maxLength={25} onChange={e => update('phone', e.target.value)} required />{fieldError('phone')}</label><label className="field">Courriel (optionnel)<input type="email" autoComplete="email" {...invalidProps('email')} value={project.email} maxLength={254} onChange={e => update('email', e.target.value)} />{fieldError('email')}</label><label className="consent"><input {...invalidProps('consent')} type="checkbox" checked={project.consent} onChange={e => update('consent', e.target.checked)} required /><span>{contactConsentText}</span></label>{fieldError('consent')}<p className="fine-print">Vos coordonnées concernent votre demande d’isolation.</p></>}

        {error && <p id="form-error" role="alert" tabIndex={-1} ref={errorHeading} className="error form-error-summary">{error}</p>}
        <div className="form-actions">{step > 0 && <button className="back" type="button" onClick={() => navigate({ step: step - 1, outcome: null, lead: null }, 'backward')}>← Retour</button>}<button className="button" type="submit">{loading ? 'Envoi…' : step === 3 ? 'Demander mon estimation' : 'Continuer'}<span aria-hidden="true" className={loading ? 'loading-spinner' : undefined}>{loading ? '' : '→'}</span></button></div>
        <p className="progress-hint">{step === 2 ? (classify(project) === 'low_intent' ? 'Vous pouvez terminer sans coordonnées.' : 'Plus qu’une étape après celle-ci.') : 'Les champs sont obligatoires, sauf mention contraire.'}</p>
      </fieldset><p className="loading-status" role="status">{loading ? 'Envoi de votre demande…' : ''}</p></form></>}
    </div></div>
    <PrivacyNotice/>
  </div>;
}
