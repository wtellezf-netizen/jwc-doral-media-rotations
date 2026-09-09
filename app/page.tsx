'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BellRing, CalendarDays, Check, CheckCircle2, ChevronRight, CircleAlert, Clock3, Filter, Gauge, Menu, MessageSquareText, Plus, Repeat2, Save, Settings2, ShieldCheck, Sparkles, Trash2, UsersRound, Video, X, XCircle } from 'lucide-react';
import { clearSession, getCurrentUser, getProfile, loadCloudState, requestMagicLink, restoreSession, saveCloudState, type CloudSession } from '../lib/supabase';

type Tab = 'Resumen' | 'Calendario' | 'Equipos' | 'Anuncios';
type Role = 'Wilson Tellez' | 'Frankie' | 'Adiel' | 'Visitante';
type CurrentUser = { id: string; email: string; displayName: string; role: 'admin' | 'editor' | 'member' };
type Person = { name: string; position: string; initials: string; color: string };
type Team = { name: string; label: string; service: string; people: Person[] };
type PracticeGroup = { id: string; title: string; label: string; teams: string[]; people: Person[] };
type Announcement = { id: string; title: string; message: string; author: string; date: string; pinned: boolean };

const people = (names: Array<[string, string]>, colors: string[]): Person[] => names.map(([name, position], index) => ({ name, position, initials: name.split(' ').map((part) => part[0]).join('').slice(0, 2), color: colors[index % colors.length] }));
const teamColors = ['#11a29a', '#e6a542', '#6c75e8', '#e56f61', '#4e9ed3'];

const initialTeams: Team[] = [
  { name: 'Equipo A', label: 'DOMINGO · 10:00 AM', service: 'Domingo 10:00', people: people([['Josue', 'CAM1'], ['Martha', 'CAM2'], ['Magaly', 'CAM3'], ['Slider libre', 'SLIDER'], ['Alberto', 'GRUA']], teamColors) },
  { name: 'Equipo B', label: 'DOMINGO · 10:00 AM', service: 'Domingo 10:00', people: people([['Wilson', 'CAM1'], ['Sara', 'CAM2'], ['Gregory', 'CAM3'], ['Slider libre', 'SLIDER'], ['Grua libre', 'GRUA']], teamColors) },
  { name: 'Equipo Viernes', label: 'VIERNES · 8:00 PM', service: 'Viernes 8:00', people: people([['Mirtha', 'CAM1'], ['Vladimir', 'CAM2'], ['Daniel', 'CAM3'], ['Pastora', 'SLIDER'], ['Allan', 'GRUA']], teamColors) },
  { name: 'Equipo 1', label: 'DOMINGO · 12:15 PM', service: 'Domingo 12:15', people: people([['Jhon', 'CAM1'], ['Vivi', 'CAM2'], ['Alany', 'CAM3'], ['Joel', 'SLIDER'], ['Leo', 'GRUA']], teamColors) },
  { name: 'Equipo 2', label: 'DOMINGO · 12:15 PM', service: 'Domingo 12:15', people: people([['Rebeca', 'CAM1'], ['Cristina', 'CAM2'], ['Cristian', 'CAM3'], ['Niko', 'SLIDER'], ['Alejandro', 'GRUA']], teamColors) },
  { name: 'Equipo J1', label: 'YOUNGS · ROTACIÓN', service: 'Youngs', people: people([['Antony', 'CAM1'], ['Cristina', 'CAM2'], ['Josue', 'CAM3'], ['Joel', 'SLIDER'], ['Leo', 'GRUA']], teamColors) },
  { name: 'Equipo J2', label: 'YOUNGS · ROTACIÓN', service: 'Youngs', people: people([['Daniel', 'CAM1'], ['Sara', 'CAM2'], ['Cristian', 'CAM3'], ['Niko', 'SLIDER'], ['Alberto', 'GRUA']], teamColors) },
  { name: 'Equipo J3', label: 'YOUNGS · ROTACIÓN', service: 'Youngs', people: people([['Jhon', 'CAM1'], ['Vivi', 'CAM2'], ['Alany', 'CAM3'], ['Niko', 'SLIDER'], ['Alejandro', 'GRUA']], teamColors) },
];

const initialPracticeGroups: PracticeGroup[] = [
  { id: 'sunday-morning', title: 'Práctica · Domingo mañana', label: '10:00 AM · nuevos integrantes para A / B', teams: ['Equipo A', 'Equipo B'], people: [] },
  { id: 'sunday-afternoon', title: 'Práctica · Domingo tarde', label: '12:15 PM · nuevos integrantes para 1 / 2', teams: ['Equipo 1', 'Equipo 2'], people: [] },
  { id: 'youngs-practice', title: 'Práctica · Youngs', label: '1er y 3er miércoles · nuevos integrantes para J1 / J2 / J3', teams: ['Equipo J1', 'Equipo J2', 'Equipo J3'], people: [] },
];

const initialAnnouncements: Announcement[] = [
  { id: 'welcome', title: 'Tablero de anuncios JWC Media', message: 'Aquí aparecerán los avisos importantes para todo el equipo de cámaras.', author: 'Wilson Tellez', date: 'Hoy', pinned: true },
  { id: 'punctuality', title: 'Puntualidad en los servicios', message: 'Revisa tu asignación con anticipación y avisa si surge una indisponibilidad.', author: 'Coordinación', date: 'Hoy', pinned: false },
];

const services = [
  { id: 'fri', day: 'VIERNES 11', date: '11 SEP', time: '8:00 PM', type: 'Servicio de viernes', tag: 'Esta semana', tagTone: 'teal', team: 'Equipo Viernes', coverage: '5 / 8', status: '3 móviles por asignar', color: 'teal' },
  { id: 'sun10', day: 'DOMINGO 13', date: '13 SEP', time: '10:00 AM', type: 'Primer servicio', tag: 'Equipo B esta semana', tagTone: 'amber', team: 'Equipo B', coverage: '5 / 8', status: '3 móviles por asignar', color: 'orange' },
  { id: 'sun12', day: 'DOMINGO 13', date: '13 SEP', time: '12:15 PM', type: 'Segundo servicio', tag: 'Equipo 2 esta semana', tagTone: 'amber', team: 'Equipo 2', coverage: '5 / 8', status: '3 móviles por asignar', color: 'violet' },
  { id: 'sun10next', day: 'DOMINGO 20', date: '20 SEP', time: '10:00 AM', type: 'Primer servicio', tag: 'Siguiente · Equipo A', tagTone: 'amber', team: 'Equipo A', coverage: '5 / 8', status: '3 móviles por asignar', color: 'orange' },
  { id: 'sun12next', day: 'DOMINGO 20', date: '20 SEP', time: '12:15 PM', type: 'Segundo servicio', tag: 'Siguiente · Equipo 1', tagTone: 'amber', team: 'Equipo 1', coverage: '5 / 8', status: '3 móviles por asignar', color: 'violet' },
  { id: 'youngs', day: 'MIÉRCOLES 16', date: '16 SEP', time: '7:30 PM', type: 'Servicio Youngs', tag: 'Rotación J1', tagTone: 'blue', team: 'Equipo J1', coverage: '5 / 8', status: '3 móviles por asignar', color: 'blue' },
];

const monthDays = [['', '', '1', '2', '3', '4', '5'], ['6', '7', '8', '9', '10', '11', '12'], ['13', '14', '15', '16', '17', '18', '19'], ['20', '21', '22', '23', '24', '25', '26'], ['27', '28', '29', '30', '', '', '']];
const eventByDay: Record<string, string> = { '11': 'viernes', '13': 'domingo', '16': 'youngs', '18': 'viernes', '20': 'domingo', '25': 'viernes', '27': 'domingo' };

function Avatar({ person, small = false }: { person: Person; small?: boolean }) { return <span className={`avatar ${small ? 'avatar-small' : ''}`} style={{ background: person.color }}>{person.initials}</span>; }

function App() {
  const [tab, setTab] = useState<Tab>('Resumen');
  const [selectedService, setSelectedService] = useState(services[0]);
  const [role, setRole] = useState<Role>('Wilson Tellez');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [session, setSession] = useState<CloudSession | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'synced' | 'local' | 'error'>('loading');
  const [notice, setNotice] = useState('');
  const [availability, setAvailability] = useState<Record<string, 'accepted' | 'declined'>>({});
  const [showPeople, setShowPeople] = useState(false);
  const [teamList, setTeamList] = useState<Team[]>(initialTeams);
  const [storageReady, setStorageReady] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [practiceGroups, setPracticeGroups] = useState<PracticeGroup[]>(initialPracticeGroups);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [announcementEditorOpen, setAnnouncementEditorOpen] = useState(false);
  const selectedTeam = useMemo(() => teamList.find((team) => team.name === selectedService.team) ?? teamList[0] ?? initialTeams[0], [selectedService, teamList]);

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'editor';
  const applyCloudState = (cloud: Awaited<ReturnType<typeof loadCloudState>>) => {
    if (!cloud) return false;
    if (Array.isArray(cloud.teams)) setTeamList(cloud.teams as Team[]);
    if (Array.isArray(cloud.practiceGroups)) setPracticeGroups(cloud.practiceGroups as PracticeGroup[]);
    if (Array.isArray(cloud.announcements)) setAnnouncements(cloud.announcements as Announcement[]);
    return true;
  };
  useEffect(() => {
    const load = async () => {
      try {
        const savedTeams = window.localStorage.getItem('jwc-doral-team-roster');
        if (savedTeams) { const parsed = JSON.parse(savedTeams) as Team[]; if (Array.isArray(parsed)) setTeamList(parsed); }
        const savedPractice = window.localStorage.getItem('jwc-doral-practice-groups');
        if (savedPractice) { const parsed = JSON.parse(savedPractice) as PracticeGroup[]; if (Array.isArray(parsed)) setPracticeGroups(parsed); }
        const savedAnnouncements = window.localStorage.getItem('jwc-doral-announcements');
        if (savedAnnouncements) { const parsed = JSON.parse(savedAnnouncements) as Announcement[]; if (Array.isArray(parsed)) setAnnouncements(parsed); }
      } catch { /* If a draft is invalid, keep the starter roster. */ }
      const restored = restoreSession();
      let activeSession = restored;
      try {
        if (restored?.accessToken) {
          const authUser = await getCurrentUser(restored);
          activeSession = { ...restored, userId: authUser.id, email: authUser.email ?? restored.email ?? '' };
          const profile = await getProfile(activeSession);
          const userRole = activeSession.email?.toLowerCase() === 'wtellezf@gmail.com' ? 'admin' : profile?.role ?? 'member';
          const displayName = profile?.display_name ?? authUser.user_metadata?.display_name ?? authUser.user_metadata?.full_name ?? activeSession.email ?? 'Usuario';
          setCurrentUser({ id: authUser.id, email: activeSession.email ?? '', displayName, role: userRole });
          setRole(displayName === 'Frankie' || displayName === 'Adiel' ? displayName : 'Wilson Tellez');
          setSession(activeSession);
        }
        const cloud = await loadCloudState(activeSession);
        setSyncStatus(applyCloudState(cloud) ? 'synced' : activeSession ? 'synced' : 'local');
      } catch { setSyncStatus(activeSession ? 'error' : 'local'); }
      setStorageReady(true);
    };
    void load();
  }, []);
  useEffect(() => {
    if (storageReady) {
      window.localStorage.setItem('jwc-doral-team-roster', JSON.stringify(teamList));
      window.localStorage.setItem('jwc-doral-practice-groups', JSON.stringify(practiceGroups));
      window.localStorage.setItem('jwc-doral-announcements', JSON.stringify(announcements));
    }
  }, [storageReady, teamList, practiceGroups, announcements]);

  useEffect(() => {
    if (!storageReady) return;
    const timer = window.setInterval(async () => {
      try {
        const cloud = await loadCloudState(session);
        if (applyCloudState(cloud)) setSyncStatus('synced');
      } catch { setSyncStatus('error'); }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [storageReady, session]);

  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 4200); };
  const requireEditor = () => { if (canEdit) return true; setLoginOpen(true); notify('Inicia sesión para hacer cambios compartidos.'); return false; };
  const syncState = async (next: { teams: Team[]; practiceGroups: PracticeGroup[]; announcements: Announcement[] }) => {
    if (!session?.userId || !canEdit) { setSyncStatus('local'); return; }
    try { await saveCloudState(next, session); setSyncStatus('synced'); }
    catch { setSyncStatus('error'); notify('No se pudo sincronizar. Revisa tu conexión e inténtalo de nuevo.'); }
  };
  const handleLogin = async (email: string) => {
    try { await requestMagicLink(email.trim().toLowerCase()); setLoginOpen(false); notify('Revisa tu correo: enviamos un enlace seguro para entrar.'); }
    catch { notify('No se pudo enviar el enlace. Verifica el correo e inténtalo de nuevo.'); }
  };
  const handleLogout = () => { clearSession(); setSession(null); setCurrentUser(null); setRole('Visitante'); setSyncStatus('local'); notify('Sesión cerrada. El sitio continúa disponible para consulta.'); };
  const handleGenerate = () => notify(`Turnos sugeridos para ${selectedService.type.toLowerCase()} listos. Se notificará a ${selectedTeam.people.filter((person) => !person.name.includes('libre')).length} personas.`);
  const handleAvailability = (state: 'accepted' | 'declined') => { setAvailability((current) => ({ ...current, [selectedService.id]: state })); notify(state === 'accepted' ? 'Disponibilidad confirmada para este servicio.' : 'Marcado como no disponible. El sistema buscará un reemplazo.'); };
  const saveTeam = (updatedTeam: Team, originalName?: string) => {
    if (!requireEditor()) return;
    if (!updatedTeam.name.trim()) { notify('Escribe un nombre para el equipo.'); return; }
    if (teamList.some((team) => team.name.toLowerCase() === updatedTeam.name.trim().toLowerCase() && team.name !== originalName)) { notify('Ya existe un equipo con ese nombre.'); return; }
    const normalized = { ...updatedTeam, name: updatedTeam.name.trim(), people: updatedTeam.people.filter((person) => person.name.trim()) };
    const nextTeams = originalName ? teamList.map((team) => team.name === originalName ? normalized : team) : [...teamList, normalized];
    setTeamList(nextTeams); void syncState({ teams: nextTeams, practiceGroups, announcements });
    if (originalName && selectedService.team === originalName) setSelectedService((current) => ({ ...current, team: normalized.name }));
    setEditingTeam(null); setCreatingTeam(false); notify(`${normalized.name} actualizado. Los cambios quedan listos para la próxima asignación.`);
  };
  const deleteTeam = (name: string) => { if (!requireEditor()) return; const nextTeams = teamList.filter((team) => team.name !== name); setTeamList(nextTeams); void syncState({ teams: nextTeams, practiceGroups, announcements }); setEditingTeam(null); notify(`${name} fue retirado de la rotación.`); };
  const addPracticePerson = (groupId: string, person: Person) => {
    if (!requireEditor()) return;
    const nextPractice = practiceGroups.map((group) => group.id === groupId ? { ...group, people: [...group.people, person] } : group);
    setPracticeGroups(nextPractice); void syncState({ teams: teamList, practiceGroups: nextPractice, announcements });
    notify(`${person.name} fue agregado a la lista de práctica.`);
  };
  const promotePracticePerson = (groupId: string, personIndex: number, targetTeam: string) => {
    if (!requireEditor()) return;
    const group = practiceGroups.find((item) => item.id === groupId);
    const candidate = group?.people[personIndex];
    if (!candidate || !targetTeam) return;
    const nextTeams = teamList.map((team) => team.name === targetTeam ? { ...team, people: [...team.people, candidate] } : team);
    const nextPractice = practiceGroups.map((item) => item.id === groupId ? { ...item, people: item.people.filter((_, index) => index !== personIndex) } : item);
    setTeamList(nextTeams); setPracticeGroups(nextPractice); void syncState({ teams: nextTeams, practiceGroups: nextPractice, announcements });
    notify(`${candidate.name} fue incluido en ${targetTeam}.`);
  };
  const removePracticePerson = (groupId: string, personIndex: number) => {
    if (!requireEditor()) return;
    const nextPractice = practiceGroups.map((group) => group.id === groupId ? { ...group, people: group.people.filter((_, index) => index !== personIndex) } : group);
    setPracticeGroups(nextPractice); void syncState({ teams: teamList, practiceGroups: nextPractice, announcements });
    notify('La persona fue retirada de la lista de práctica.');
  };
  const saveAnnouncement = (draft: Omit<Announcement, 'id' | 'author' | 'date'> & { id?: string }) => {
    if (!requireEditor()) return;
    const announcement: Announcement = { ...draft, id: draft.id ?? `announcement-${Date.now()}`, author: currentUser?.displayName ?? role, date: 'Hoy' };
    const nextAnnouncements = [announcement, ...announcements.filter((item) => item.id !== announcement.id)];
    setAnnouncements(nextAnnouncements); void syncState({ teams: teamList, practiceGroups, announcements: nextAnnouncements });
    setAnnouncementEditorOpen(false);
    notify('Anuncio publicado para todo el equipo.');
  };
  const toggleAnnouncementPin = (id: string) => { if (!requireEditor()) return; const nextAnnouncements = announcements.map((item) => item.id === id ? { ...item, pinned: !item.pinned } : item); setAnnouncements(nextAnnouncements); void syncState({ teams: teamList, practiceGroups, announcements: nextAnnouncements }); };
  const deleteAnnouncement = (id: string) => { if (!requireEditor()) return; const nextAnnouncements = announcements.filter((item) => item.id !== id); setAnnouncements(nextAnnouncements); void syncState({ teams: teamList, practiceGroups, announcements: nextAnnouncements }); notify('Anuncio retirado del tablero.'); };

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand-mark"><Video size={18} strokeWidth={2.5} /></div><div className="brand-copy"><span>JWC Doral</span><strong>MEDIA ROTATIONS</strong></div><button className="mobile-menu" aria-label="Abrir menú"><Menu size={20} /></button>
      <nav className="main-nav" aria-label="Navegación principal">{(['Resumen', 'Calendario', 'Equipos', 'Anuncios'] as Tab[]).map((item) => <button key={item} className={`nav-item ${tab === item ? 'active' : ''}`} onClick={() => setTab(item)}>{item === 'Resumen' ? <Gauge size={18} /> : item === 'Calendario' ? <CalendarDays size={18} /> : item === 'Equipos' ? <UsersRound size={18} /> : <MessageSquareText size={18} />}<span>{item}</span>{item === 'Calendario' && <em>7</em>}</button>)}</nav>
      <div className="sidebar-rule" /><p className="sidebar-label">OPERACIÓN</p>
      <button className="nav-item" onClick={() => notify('La siguiente generación aplicará la rotación automática por servicio.')}><Repeat2 size={18} /><span>Reglas de rotación</span></button><button className="nav-item" onClick={() => notify('Recordatorios configurados: 7 días y 24 horas antes.')}><BellRing size={18} /><span>Recordatorios</span></button><button className="nav-item" onClick={() => notify('Los permisos activos son Wilson, Frankie y Adiel.')}><ShieldCheck size={18} /><span>Permisos</span></button>
      <div className="sidebar-bottom"><div className="team-health"><span className="status-dot" /><div><strong>Operación saludable</strong><small>{teamList.length} equipos · {new Set(teamList.flatMap((team) => team.people.filter((person) => !person.name.includes('libre')).map((person) => person.name))).size} personas</small></div></div><div className="signed-user"><span className="avatar avatar-user">WT</span><div><strong>{role}</strong><small>{role === 'Wilson Tellez' ? 'Administrador' : 'Editor'}</small></div><Settings2 size={17} /></div></div>
    </aside>
    <section className="content-area">
      <header className="topbar"><div><p className="eyebrow">JESUS WORSHIP CENTER · DORAL</p><h1>{tab === 'Resumen' ? 'Centro de coordinación' : tab}</h1></div><div className="topbar-actions"><div className="role-switcher"><span className="online-dot" /><select value={currentUser ? role : 'Visitante'} disabled aria-label="Usuario activo"><option>Wilson Tellez</option><option>Frankie</option><option>Adiel</option><option>Visitante</option></select><span className="role-tag">{currentUser?.role === 'admin' ? 'ADMIN' : currentUser?.role === 'editor' ? 'EDITOR' : 'CONSULTA'}</span></div>{currentUser ? <button className="outline-button compact" onClick={handleLogout}>Salir</button> : <button className="outline-button compact" onClick={() => setLoginOpen(true)}>Iniciar sesión</button>}<button className="icon-button" aria-label="Notificaciones" onClick={() => notify('No tienes notificaciones nuevas.')}><BellRing size={19} /></button><button className="primary-button" onClick={handleGenerate}><Sparkles size={17} /> Generar turnos</button></div></header>
      {notice && <div className="toast" role="status"><CheckCircle2 size={18} />{notice}<button onClick={() => setNotice('')} aria-label="Cerrar aviso"><X size={16} /></button></div>}
      {tab === 'Resumen' && <>
        <div className="hero-row"><div><p className="section-kicker">SEMANA DEL 7 AL 13 DE SEPTIEMBRE</p><h2>Todo listo para servir.</h2><p className="hero-subtitle">La agenda se actualiza sola. Revisa quién sirve, confirma disponibilidad y deja que la rotación haga el resto.</p></div><div className="next-service"><div className="next-service-top"><span>PRÓXIMO SERVICIO</span><span className="live-pill"><span className="status-dot" /> automático</span></div><strong>Viernes 11 · 8:00 PM</strong><small>Servicio de viernes · Equipo Viernes</small><div className="mini-avatars">{teamList[2]?.people.slice(0, 4).map((person) => <Avatar key={person.name + person.position} person={person} small />)}<span className="more-avatar">+4</span></div></div></div>
        <section className="stats-grid" aria-label="Resumen operativo"><div className="stat-card stat-teal"><div className="stat-icon"><CalendarDays size={18} /></div><span>Servicios este mes</span><strong>14</strong><small><span className="up">+2</span> vs. mes anterior</small></div><div className="stat-card stat-amber"><div className="stat-icon"><UsersRound size={18} /></div><span>Personas activas</span><strong>{new Set(teamList.flatMap((team) => team.people.filter((person) => !person.name.includes('libre')).map((person) => person.name))).size}</strong><small>{teamList.length} equipos configurados</small></div><div className="stat-card stat-violet"><div className="stat-icon"><CheckCircle2 size={18} /></div><span>Confirmaciones</span><strong>86%</strong><small><span className="up">+8%</span> esta semana</small></div><div className="stat-card stat-blue"><div className="stat-icon"><BellRing size={18} /></div><span>Recordatorios enviados</span><strong>21</strong><small>Últimos 7 días</small></div></section>
        <div className="workspace-grid"><section className="panel services-panel"><div className="panel-heading"><div><p className="section-kicker">AGENDA OPERATIVA</p><h3>Próximos servicios</h3></div><button className="ghost-button" onClick={() => setTab('Calendario')}>Ver calendario <ArrowUpRight size={15} /></button></div><div className="service-list">{services.map((service) => <button key={service.id} className={`service-row ${selectedService.id === service.id ? 'selected' : ''}`} onClick={() => setSelectedService(service)}><div className={`service-date date-${service.color}`}><strong>{service.date.split(' ')[0]}</strong><span>{service.date.split(' ')[1]}</span></div><div className="service-main"><div className="service-title"><strong>{service.type}</strong><span className={`tag tag-${service.tagTone}`}>{service.tag}</span></div><span className="service-meta"><Clock3 size={13} /> {service.day} · {service.time} <i /> {service.team}</span></div><div className="coverage"><strong>{service.coverage}</strong><span>asignados</span></div><ChevronRight size={17} className="chevron" /></button>)}</div></section>
          <section className="panel detail-panel"><div className="panel-heading"><div><p className="section-kicker">DETALLE DEL SERVICIO</p><h3>{selectedService.type}</h3></div><span className="detail-status"><span className="status-dot" /> {selectedService.tag}</span></div><div className="detail-date"><CalendarDays size={17} /><strong>{selectedService.day}</strong><span>·</span><span>{selectedService.time}</span></div><div className="assignment-card"><div className="assignment-header"><div><p>ASIGNACIÓN SUGERIDA</p><strong>{selectedTeam.name}</strong></div><button className="icon-button subtle" onClick={() => setShowPeople((current) => !current)} aria-label="Ver personas"><UsersRound size={17} /></button></div><div className="position-list">{selectedTeam.people.map((person) => <div className="position-row" key={`${person.name}-${person.position}`}><span className="position-label">{person.position}</span>{person.name.includes('libre') ? <span className="vacant"><CircleAlert size={14} /> pendiente</span> : <span className="person-name"><Avatar person={person} small />{person.name}</span>}<span className="assignment-check">{person.name.includes('libre') ? <Plus size={15} /> : <Check size={15} />}</span></div>)}{['MÓVIL 1', 'MÓVIL 2', 'MÓVIL 3'].map((position) => <div className="position-row" key={position}><span className="position-label">{position}</span><span className="vacant"><CircleAlert size={14} /> pendiente</span><span className="assignment-check pending"><Plus size={15} /></span></div>)}</div><div className="coverage-line"><span><strong>{selectedService.coverage}</strong> posiciones cubiertas</span><span>{selectedService.status}</span></div></div>{showPeople && <div className="people-drawer"><strong>Personas disponibles</strong><span>El algoritmo prioriza menor carga y evita dobles turnos.</span><div className="drawer-people">{teamList.slice(3, 5).flatMap((team) => team.people.slice(0, 2)).map((person) => <span key={person.name + person.position}><Avatar person={person} small />{person.name}</span>)}</div></div>}<div className="detail-actions"><button className="outline-button" onClick={() => notify('La asignación queda guardada para revisión del equipo coordinador.')}>Editar asignación</button><button className="primary-button compact" onClick={handleGenerate}><Sparkles size={16} /> Completar automáticamente</button></div></section></div>
      </>}
      {tab === 'Calendario' && <CalendarView selectedService={selectedService} onSelect={(service) => { setSelectedService(service); setTab('Resumen'); }} />}
      {tab === 'Equipos' && <TeamsView teams={teamList} practiceGroups={practiceGroups} onEdit={setEditingTeam} onNew={() => setCreatingTeam(true)} onAddPractice={addPracticePerson} onPromotePractice={promotePracticePerson} onRemovePractice={removePracticePerson} />}
      {tab === 'Anuncios' && <AnnouncementsView announcements={announcements} onNew={() => setAnnouncementEditorOpen(true)} onTogglePin={toggleAnnouncementPin} onDelete={deleteAnnouncement} />}
      <footer className="page-footer"><span>JWC Doral · Media Rotations</span><span><span className="status-dot" /> {syncStatus === 'synced' ? 'Sincronizado con Supabase' : syncStatus === 'error' ? 'Revisar sincronización' : syncStatus === 'loading' ? 'Conectando con Supabase' : 'Modo consulta'}</span></footer>
    </section>
    <div className="availability-bar"><span><BellRing size={17} /><strong>Tu próxima asignación</strong><span>{selectedService.type} · {selectedService.day}</span></span><div>{availability[selectedService.id] === 'accepted' ? <span className="confirmed"><CheckCircle2 size={16} /> Confirmado</span> : availability[selectedService.id] === 'declined' ? <span className="declined"><XCircle size={16} /> Buscar reemplazo</span> : <><button className="availability-button decline" onClick={() => handleAvailability('declined')}>No puedo</button><button className="availability-button accept" onClick={() => handleAvailability('accepted')}>Sí, puedo servir <Check size={15} /></button></>}</div></div>
    {(editingTeam || creatingTeam) && <TeamEditor team={editingTeam ?? { name: '', label: 'NUEVO EQUIPO', service: 'Rotación', people: [] }} onSave={(team) => saveTeam(team, editingTeam?.name)} onDelete={editingTeam ? () => deleteTeam(editingTeam.name) : undefined} onClose={() => { setEditingTeam(null); setCreatingTeam(false); }} />}
    {announcementEditorOpen && <AnnouncementEditor onSave={saveAnnouncement} onClose={() => setAnnouncementEditorOpen(false)} />}
    {loginOpen && <LoginDialog onSubmit={handleLogin} onClose={() => setLoginOpen(false)} />}
  </main>;
}

function CalendarView({ selectedService, onSelect }: { selectedService: typeof services[number]; onSelect: (service: typeof services[number]) => void }) {
  return <div className="view-stack"><div className="view-header"><div><p className="section-kicker">PLANIFICACIÓN MENSUAL</p><h2>Septiembre 2026</h2><p>Los servicios recurrentes se generan automáticamente según las reglas de JWC Doral.</p></div><div className="calendar-actions"><button className="outline-button"><Filter size={16} /> Filtrar</button><button className="primary-button"><Plus size={17} /> Evento especial</button></div></div><div className="calendar-layout"><section className="panel month-panel"><div className="month-toolbar"><button className="icon-button"><ChevronRight size={17} className="rotate-180" /></button><strong>Septiembre 2026</strong><button className="icon-button"><ChevronRight size={17} /></button></div><div className="weekdays">{['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'].map((day) => <span key={day}>{day}</span>)}</div><div className="month-grid">{monthDays.flatMap((week, weekIndex) => week.map((day, dayIndex) => <div className={`calendar-cell ${day === '5' ? 'today' : ''}`} key={`${weekIndex}-${dayIndex}`}>{day && <><span className="calendar-number">{day}</span>{eventByDay[day] && <div className={`calendar-event event-${eventByDay[day]}`}>{eventByDay[day] === 'viernes' ? 'Viernes · 8 PM' : eventByDay[day] === 'youngs' ? 'Youngs · 7:30 PM' : 'Domingos · 2 servicios'}</div>}</>}</div>))}</div></section><aside className="panel rules-panel"><p className="section-kicker">REGLAS ACTIVAS</p><h3>La agenda se cuida sola</h3><div className="rule-item"><span className="rule-icon teal-bg"><Repeat2 size={17} /></span><div><strong>Viernes</strong><span>Todos los viernes · 8:00 PM</span></div><CheckCircle2 size={16} className="rule-check" /></div><div className="rule-item"><span className="rule-icon violet-bg"><CalendarDays size={17} /></span><div><strong>Domingos · 10:00 AM</strong><span>B este domingo → A el siguiente → repetir</span><div className="rule-secondary">Los Teams A y B alternan en el primer servicio.</div></div><CheckCircle2 size={16} className="rule-check" /></div><div className="rule-item"><span className="rule-icon amber-bg"><CalendarDays size={17} /></span><div><strong>Domingos · 12:15 PM</strong><span>2 este domingo → 1 el siguiente → repetir</span><div className="rule-secondary">Los Teams 1 y 2 alternan en el segundo servicio.</div></div><CheckCircle2 size={16} className="rule-check" /></div><div className="rule-item"><span className="rule-icon blue-bg"><Sparkles size={17} /></span><div><strong>Youngs</strong><span>1er y 3er miércoles · rotación J1/J2/J3</span></div><CheckCircle2 size={16} className="rule-check" /></div><div className="rule-item"><span className="rule-icon blue-bg"><Plus size={17} /></span><div><strong>Eventos especiales</strong><span>Se agregan manualmente</span></div><CheckCircle2 size={16} className="rule-check" /></div><div className="rule-note"><CircleAlert size={16} /><span>El sistema avisa 7 días y 24 horas antes. Si alguien rechaza, propone reemplazos por disponibilidad y carga.</span></div></aside></div><div className="panel upcoming-panel"><div className="panel-heading"><div><p className="section-kicker">SELECCIONA UN TURNO</p><h3>Servicios generados</h3></div><span className="ghost-count">6 servicios próximos</span></div><div className="upcoming-grid">{services.map((service) => <button key={service.id} className={`upcoming-card ${selectedService.id === service.id ? 'selected' : ''}`} onClick={() => onSelect(service)}><span className={`service-dot dot-${service.color}`} /><strong>{service.type}</strong><span>{service.day} · {service.time}</span><small>{service.team} · {service.coverage}</small></button>)}</div></div></div>;
}

function TeamsView({ teams, practiceGroups, onEdit, onNew, onAddPractice, onPromotePractice, onRemovePractice }: { teams: Team[]; practiceGroups: PracticeGroup[]; onEdit: (team: Team) => void; onNew: () => void; onAddPractice: (groupId: string, person: Person) => void; onPromotePractice: (groupId: string, personIndex: number, targetTeam: string) => void; onRemovePractice: (groupId: string, personIndex: number) => void }) {
  return <div className="view-stack"><div className="view-header"><div><p className="section-kicker">PERSONAS Y POSICIONES</p><h2>Equipos de servicio</h2><p>Revisa cada team y ajusta participantes, posiciones o equipos completos.</p></div><button className="primary-button" onClick={onNew}><Plus size={17} /> Nuevo equipo</button></div><div className="team-grid">{teams.map((team, index) => <article className="team-card" key={team.name}><div className="team-card-top"><div><span className={`team-index team-index-${index % 4}`}>{String(index + 1).padStart(2, '0')}</span><div><h3>{team.name}</h3><p>{team.label}</p></div></div><button className="icon-button subtle" onClick={() => onEdit(team)} aria-label={`Editar ${team.name}`}><Settings2 size={17} /></button></div><div className="team-people">{team.people.map((person) => <div className="team-person" key={person.name + person.position}><Avatar person={person} small /><span><strong>{person.name}</strong><small>{person.position}</small></span>{person.name.includes('libre') && <span className="vacancy-pill">Libre</span>}</div>)}</div><div className="team-card-footer"><span>{team.people.length} participantes</span><button onClick={() => onEdit(team)}>Editar equipo <ChevronRight size={15} /></button></div></article>)}</div><PracticeBoard groups={practiceGroups} onAdd={onAddPractice} onPromote={onPromotePractice} onRemove={onRemovePractice} /><div className="permission-panel panel"><div className="permission-copy"><span className="rule-icon violet-bg"><ShieldCheck size={18} /></span><div><p className="section-kicker">ACCESO COMPARTIDO</p><h3>3 personas pueden hacer cambios</h3><p>El sitio es público para consultar la agenda. La coordinación queda reservada para Wilson, Frankie y Adiel.</p></div></div><div className="permission-people"><div><span className="avatar avatar-user">WT</span><span><strong>Wilson Tellez</strong><small>Administrador</small></span></div><div><span className="avatar" style={{ background: '#e6a542' }}>FR</span><span><strong>Frankie</strong><small>Editor</small></span></div><div><span className="avatar" style={{ background: '#6c75e8' }}>AD</span><span><strong>Adiel</strong><small>Editor</small></span></div></div></div></div>;
}

function PracticeBoard({ groups, onAdd, onPromote, onRemove }: { groups: PracticeGroup[]; onAdd: (groupId: string, person: Person) => void; onPromote: (groupId: string, personIndex: number, targetTeam: string) => void; onRemove: (groupId: string, personIndex: number) => void }) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('CAM1');
  const [targets, setTargets] = useState<Record<string, string>>({});
  const openGroup = groups.find((group) => group.id === openGroupId);
  const openForm = (group: PracticeGroup) => { setOpenGroupId(group.id); setName(''); setPosition('CAM1'); };
  const submit = () => {
    if (!openGroup || !name.trim()) return;
    const person: Person = { name: name.trim(), position, initials: name.trim().split(' ').map((part) => part[0]).join('').slice(0, 2), color: teamColors[openGroup.people.length % teamColors.length] };
    onAdd(openGroup.id, person); setName(''); setPosition('CAM1');
  };
  return <section className="practice-section"><div className="section-heading-row"><div><p className="section-kicker">CRECIMIENTO DEL EQUIPO</p><h3>Práctica · Nuevos integrantes</h3><p>Agrega personas para entrenarlas y luego inclúyelas en el team que corresponda.</p></div><span className="soft-status"><Sparkles size={14} /> incorporación gradual</span></div><div className="practice-board">{groups.map((group) => <article className="practice-card" key={group.id}><div className="practice-card-top"><div><span className="practice-icon"><UsersRound size={17} /></span><div><h4>{group.title}</h4><p>{group.label}</p></div></div><span className="practice-count">{group.people.length}</span></div><div className="practice-people">{group.people.length === 0 ? <div className="practice-empty"><UsersRound size={18} /><span>Aún no hay personas en práctica.</span></div> : group.people.map((person, index) => { const targetKey = `${group.id}-${index}`; const target = targets[targetKey] ?? group.teams[0]; return <div className="practice-person" key={`${person.name}-${index}`}><Avatar person={person} small /><div><strong>{person.name}</strong><small>{person.position}</small></div><div className="practice-person-actions"><select value={target} onChange={(event) => setTargets((current) => ({ ...current, [targetKey]: event.target.value }))} aria-label={`Team destino para ${person.name}`}>{group.teams.map((team) => <option key={team}>{team}</option>)}</select><button className="mini-primary" onClick={() => onPromote(group.id, index, target)}>Incluir</button><button className="remove-person mini-remove" onClick={() => onRemove(group.id, index)} aria-label={`Retirar a ${person.name}`}><Trash2 size={14} /></button></div></div> })}</div>{openGroupId === group.id ? <div className="practice-form"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del nuevo integrante" aria-label="Nombre del nuevo integrante" /><select value={position} onChange={(event) => setPosition(event.target.value)} aria-label="Posición de práctica">{['CAM1', 'CAM2', 'CAM3', 'SLIDER', 'GRUA', 'MÓVIL 1', 'MÓVIL 2', 'MÓVIL 3'].map((item) => <option key={item}>{item}</option>)}</select><button className="primary-button compact" onClick={submit}><Save size={15} /> Guardar</button><button className="icon-button" onClick={() => setOpenGroupId(null)} aria-label="Cancelar"><X size={15} /></button></div> : <button className="practice-add" onClick={() => openForm(group)}><Plus size={15} /> Añadir persona a práctica</button>}</article>)}</div></section>;
}

function AnnouncementsView({ announcements, onNew, onTogglePin, onDelete }: { announcements: Announcement[]; onNew: () => void; onTogglePin: (id: string) => void; onDelete: (id: string) => void }) {
  const ordered = [...announcements].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  return <div className="view-stack"><div className="view-header"><div><p className="section-kicker">COMUNICACIÓN DEL EQUIPO</p><h2>Tablero de anuncios</h2><p>Mensajes visibles para todos los integrantes de JWC Media.</p></div><button className="primary-button" onClick={onNew}><Plus size={17} /> Nuevo anuncio</button></div><div className="announcement-board">{ordered.map((announcement) => <article className={`announcement-card ${announcement.pinned ? 'pinned' : ''}`} key={announcement.id}><div className="announcement-top"><span className="announcement-icon"><MessageSquareText size={18} /></span><div><div className="announcement-title-row"><h3>{announcement.title}</h3>{announcement.pinned && <span className="pin-pill">Fijado</span>}</div><p className="announcement-message">{announcement.message}</p></div></div><div className="announcement-bottom"><span><strong>{announcement.author}</strong> · {announcement.date}</span><div className="announcement-actions"><button className="ghost-button" onClick={() => onTogglePin(announcement.id)}>{announcement.pinned ? 'Desfijar' : 'Fijar'}</button><button className="icon-button subtle" onClick={() => onDelete(announcement.id)} aria-label={`Eliminar ${announcement.title}`}><Trash2 size={16} /></button></div></div></article>)}</div></div>;
}

function AnnouncementEditor({ onSave, onClose }: { onSave: (draft: Omit<Announcement, 'id' | 'author' | 'date'>) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [pinned, setPinned] = useState(false);
  return <div className="editor-overlay" role="dialog" aria-modal="true" aria-label="Nuevo anuncio"><section className="announcement-editor panel"><div className="editor-heading"><div><p className="section-kicker">COMUNICACIÓN</p><h2>Nuevo anuncio</h2><p>El mensaje quedará visible para todo el equipo.</p></div><button className="icon-button" onClick={onClose} aria-label="Cerrar editor"><X size={18} /></button></div><div className="announcement-fields"><label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Reunión de preparación" /></label><label>Mensaje<textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribe el anuncio para todos..." rows={5} /></label><label className="pin-check"><input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} /> Fijar este anuncio arriba</label></div><div className="editor-actions"><span /><button className="outline-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={!title.trim() || !message.trim()} onClick={() => onSave({ title: title.trim(), message: message.trim(), pinned })}><Save size={16} /> Publicar anuncio</button></div></section></div>;
}

function LoginDialog({ onSubmit, onClose }: { onSubmit: (email: string) => void; onClose: () => void }) {
  const [email, setEmail] = useState('wtellezf@gmail.com');
  return <div className="editor-overlay" role="dialog" aria-modal="true" aria-label="Iniciar sesión"><section className="announcement-editor panel"><div className="editor-heading"><div><p className="section-kicker">ACCESO DE COORDINACIÓN</p><h2>Iniciar sesión</h2><p>Te enviaremos un enlace seguro al correo autorizado.</p></div><button className="icon-button" onClick={onClose} aria-label="Cerrar acceso"><X size={18} /></button></div><div className="announcement-fields"><label>Correo electrónico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu correo@ejemplo.com" /></label><p className="login-note">El tablero y la agenda son públicos. Solo los coordinadores autorizados pueden guardar cambios compartidos.</p></div><div className="editor-actions"><span /><button className="outline-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={!email.trim()} onClick={() => onSubmit(email)}><BellRing size={16} /> Enviar enlace</button></div></section></div>;
}

function TeamEditor({ team, onSave, onDelete, onClose }: { team: Team; onSave: (team: Team) => void; onDelete?: () => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Team>(team);
  const updatePerson = (index: number, key: 'name' | 'position', value: string) => setDraft((current) => ({ ...current, people: current.people.map((person, personIndex) => personIndex === index ? { ...person, [key]: value, initials: key === 'name' ? value.split(' ').map((part) => part[0]).join('').slice(0, 2) : person.initials } : person) }));
  const addPerson = () => setDraft((current) => ({ ...current, people: [...current.people, { name: '', position: 'CAM1', initials: 'N', color: teamColors[current.people.length % teamColors.length] }] }));
  const removePerson = (index: number) => setDraft((current) => ({ ...current, people: current.people.filter((_, personIndex) => personIndex !== index) }));
  return <div className="editor-overlay" role="dialog" aria-modal="true" aria-label={team.name ? `Editar ${team.name}` : 'Nuevo equipo'}><section className="team-editor panel"><div className="editor-heading"><div><p className="section-kicker">CONFIGURACIÓN DEL EQUIPO</p><h2>{team.name ? 'Editar equipo' : 'Nuevo equipo'}</h2><p>Agrega, elimina o cambia participantes y posiciones.</p></div><button className="icon-button" onClick={onClose} aria-label="Cerrar editor"><X size={18} /></button></div><div className="editor-fields"><label>Nombre del equipo<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ej. Equipo Youngs 4" /></label><label>Descripción<input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="Ej. DOMINGO · 10:00 AM" /></label><label>Tipo de servicio<select value={draft.service} onChange={(event) => setDraft({ ...draft, service: event.target.value })}><option>Viernes 8:00</option><option>Domingo 10:00</option><option>Domingo 12:15</option><option>Youngs</option><option>Rotación</option><option>Evento especial</option></select></label></div><div className="editor-list-heading"><div><p className="section-kicker">PARTICIPANTES</p><strong>{draft.people.length} posiciones configuradas</strong></div><button className="outline-button" onClick={addPerson}><Plus size={15} /> Añadir participante</button></div><div className="editor-people">{draft.people.map((person, index) => <div className="editor-person" key={`${index}-${person.color}`}><span className="editor-index">{String(index + 1).padStart(2, '0')}</span><input aria-label={`Nombre participante ${index + 1}`} value={person.name} onChange={(event) => updatePerson(index, 'name', event.target.value)} placeholder="Nombre" /><select aria-label={`Posición participante ${index + 1}`} value={person.position} onChange={(event) => updatePerson(index, 'position', event.target.value)}>{['CAM1', 'CAM2', 'CAM3', 'SLIDER', 'GRUA', 'MÓVIL 1', 'MÓVIL 2', 'MÓVIL 3'].map((position) => <option key={position}>{position}</option>)}</select><button className="remove-person" onClick={() => removePerson(index)} aria-label={`Eliminar participante ${index + 1}`}><Trash2 size={16} /></button></div>)}</div><div className="editor-actions">{onDelete && <button className="danger-button" onClick={onDelete}><Trash2 size={16} /> Eliminar equipo</button>}<span /><button className="outline-button" onClick={onClose}>Cancelar</button><button className="primary-button" onClick={() => onSave(draft)}><Save size={16} /> Guardar cambios</button></div></section></div>;
}

export default App;
