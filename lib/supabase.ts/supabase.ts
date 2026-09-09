export type CloudSession = { accessToken: string; refreshToken?: string; userId?: string; email?: string };

export type CloudState = {
  teams: unknown[];
  practiceGroups: unknown[];
  announcements: unknown[];
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://qotzgfwlvyrpkfwyojfv.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_jlTVRO2Akt4pnJMt9OKglQ_4alb03ow';
const SESSION_KEY = 'jwc-doral-supabase-session';

async function request(path: string, options: RequestInit = {}, session?: CloudSession | null) {
  const headers = new Headers(options.headers);
  headers.set('apikey', SUPABASE_KEY);
  headers.set('Authorization', `Bearer ${session?.accessToken ?? SUPABASE_KEY}`);
  headers.set('Content-Type', 'application/json');
  const response = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
  if (!response.ok) throw new Error(await response.text());
  return response.status === 204 ? null : response.json();
}

export function restoreSession(): CloudSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hash.get('access_token');
    const userId = hash.get('user_id');
    const email = hash.get('email');
    if (accessToken) {
      const session = { accessToken, refreshToken: hash.get('refresh_token') ?? undefined, userId: userId ?? undefined, email: email ?? undefined };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
      return session;
    }
    const stored = window.localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) as CloudSession : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(SESSION_KEY);
}

export async function requestMagicLink(email: string) {
  return request('/auth/v1/otp', { method: 'POST', body: JSON.stringify({ email, create_user: true, options: { emailRedirectTo: window.location.origin } }) });
}

export async function getCurrentUser(session: CloudSession) {
  return request('/auth/v1/user', {}, session) as Promise<{ id: string; email?: string; user_metadata?: { display_name?: string; full_name?: string } }>;
}

export async function getProfile(session: CloudSession) {
  if (!session.userId) return null;
  const rows = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(session.userId)}&select=id,display_name,role,email_reminders,whatsapp_reminders,active`, {}, session) as Array<{ id: string; display_name: string; role: 'admin' | 'editor' | 'member'; active: boolean }>;
  return rows[0] ?? null;
}

export async function loadCloudState(session?: CloudSession | null): Promise<CloudState | null> {
  const rows = await request('/rest/v1/jwc_app_state?key=eq.jwc&select=value', {}, session) as Array<{ value: CloudState }>;
  return rows[0]?.value ?? null;
}

export async function saveCloudState(state: CloudState, session: CloudSession) {
  if (!session.userId) throw new Error('La sesión no tiene un usuario válido.');
  await request('/rest/v1/jwc_app_state?on_conflict=key', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ key: 'jwc', value: state, updated_by: session.userId }]) }, session);
}
