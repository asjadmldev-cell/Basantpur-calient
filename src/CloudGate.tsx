import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Cloud, LogOut, RefreshCw, Upload, LockKeyhole, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { cloudConfigurationError, supabase } from './supabase';
import { CloudWorkspace } from './cloud-workspace';
import { configureWorkspace } from './workspace-backend';
import { localSnapshot } from './storage';
import './cloud.css';

export default function CloudGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [backend, setBackend] = useState<{ owner: string; workspace: CloudWorkspace }>();
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [retry, setRetry] = useState(0), [epoch, setEpoch] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    let active = true, observed = false;
    const { data } = supabase.auth.onAuthStateChange((_event, value) => {
      observed = true;
      if (active) setSession(value);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || observed) return;
      if (error) setError(error.message);
      setSession(data.session);
    }).catch(err => { if (active) { setError(String(err)); setSession(null); } });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  const owner = session?.user.id;
  useEffect(() => {
    configureWorkspace(); setBackend(undefined); setError(''); setMessage('');
    if (!owner || !supabase) return;
    let active = true;
    const workspace = new CloudWorkspace(supabase, owner, new URL(import.meta.env.VITE_SUPABASE_URL).host);
    workspace.initialize().then(() => {
      if (active) { configureWorkspace(workspace); setBackend({ owner, workspace }); }
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Cloud connection failed.'); });
    return () => { active = false; configureWorkspace(); };
  }, [owner, retry]);
  async function signIn(event: FormEvent) {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setPassword('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not sign in. Please retry.'); }
    finally { setBusy(false); }
  }
  async function signOut() {
    if (!supabase) return;
    setBusy(true); setError('');
    try { const { error } = await supabase.auth.signOut({ scope: 'local' }); if (error) throw error; }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not sign out.'); }
    finally { setBusy(false); }
  }
  async function importBrowser() {
    if (!backend) return;
    if (!window.confirm(`Import the products, saved receipts and shop details from this browser into ${session?.user.email}? Existing cloud bills and edited cloud products will be kept.`)) return;
    setBusy(true); setError(''); setMessage('Importing browser records…');
    try {
      const result = await backend.workspace.importLocal(await localSnapshot());
      setMessage(`Import complete: ${result.imported} records transferred; ${result.skipped} existing records kept. Original browser data is unchanged.`);
      setEpoch(n => n + 1);
    } catch (err) { setError((err instanceof Error ? err.message : 'Import failed.') + ' Original browser data is safe. Retry to transfer remaining records.'); setMessage(''); }
    finally { setBusy(false); }
  }
  if (cloudConfigurationError) return <div className="cloud-login"><section><Cloud size={32}/><h1>Connect your workspace</h1><p role="alert">{cloudConfigurationError}</p></section></div>;
  if (!supabase) return <>{children}</>;
  if (session === undefined) return <div className="cloud-loading">Opening your secure workspace…</div>;
  if (!session) return <main className="store-login">
    <div className="login-story">
      <div className="login-brand"><img src="/computer-care-logo.png" alt=""/><span>Computer Care<span className="login-brand-dot">.</span></span></div>
      <div className="login-story-copy"><h1>Every big thing<br/>starts small.</h1><p>A little care. A lot of growth.<br/>Let’s take care of your store.</p></div>
      <span className="login-story-footer">YOUR STORE, ON EVERY DEVICE</span>
    </div>
    <section className="login-panel" aria-labelledby="login-title">
      <div className="login-panel-content">
        <span className="login-welcome">WELCOME BACK</span>
        <h2 id="login-title">Log in to your account</h2>
        <p className="login-intro">Everything you need to run your store, in one place.</p>
        <form onSubmit={signIn} aria-busy={busy}>
          <div className="login-field"><label htmlFor="store-email">Email address</label><div className="login-input"><Mail aria-hidden="true" size={22}/><input id="store-email" type="email" autoComplete="username" placeholder="Enter your email" required value={email} onChange={e => setEmail(e.target.value)}/></div></div>
          <div className="login-field"><label htmlFor="store-password">Password</label><div className="login-input"><LockKeyhole aria-hidden="true" size={22}/><input id="store-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={e => setPassword(e.target.value)}/><button className="login-password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={21}/> : <Eye size={21}/>}</button></div></div>
          <details className="login-help"><summary>Need help signing in?</summary><p>Use your store account’s email and password. If you’ve forgotten your password or need access, contact the store owner.</p></details>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div className="login-divider"><span/>Made for your everyday<span/></div>
        <div className="login-workspace-note"><ShieldCheck size={23} aria-hidden="true"/><p>Products, receipts &amp; accounts.<br/><span>Ready whenever you are.</span></p></div>
        <p className="login-account-note">Your store travels with you.<br/>Use the same account on your phone and computer.</p>
      </div>
    </section>
  </main>;
  if (!backend || backend.owner !== session.user.id) return <div className="cloud-login"><section><Cloud size={32}/><h1>Connecting your store</h1>{error ? <><p className="billing-error" role="alert">{error}</p><button className="primary" onClick={() => setRetry(n => n + 1)}>Retry connection</button></> : <p>Loading your saved workspace…</p>}<button className="text-button" onClick={signOut} disabled={busy}>Sign out</button></section></div>;
  return <><div className="cloud-account-bar"><span><Cloud size={17}/><b>Cloud workspace</b><small>{session.user.email}</small></span><div><button disabled={busy} onClick={() => window.dispatchEvent(new Event('computer-care-refresh'))}><RefreshCw size={14}/>Refresh</button><button disabled={busy} onClick={importBrowser}><Upload size={14}/>Import browser data</button><button disabled={busy} onClick={signOut}><LogOut size={14}/>Sign out</button></div></div>{(error || message) && <div className={'cloud-notice ' + (error ? 'error' : '')} role={error ? 'alert' : 'status'}>{error || message}</div>}{busy ? <div className="cloud-loading">Please wait…</div> : <div key={`${owner}-${epoch}`}>{children}</div>}</>;
}
