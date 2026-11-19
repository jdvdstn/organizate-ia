import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { CheckCheck, CalendarDays, ChevronRight, CircleAlert, CircleHelp, Clock3, Coffee, GraduationCap, LayoutDashboard, ListTodo, MessageSquareText, Plus, RefreshCw, Send, Sparkles, Trash2, Pencil, X, ArrowUpRight } from 'lucide-react';
import PwaInstallButton from '@/components/PwaInstallButton';
import { createTodayStudyPlan, getStudyPlanRevision, sortStudyTasks, taskDueLabel, type TodayStudyPlan } from '@/lib/study-plan';

type Priority = 'alta' | 'media' | 'baja';
type Task = { id: string; title: string; subject: string; dueDate: string; priority: Priority; completed: boolean };
type ScheduleItem = { id: string; title: string; subject: string; dayOfWeek: number; startTime: string; endTime: string; kind: 'clase' | 'actividad' };
type ChatMessage = { role: 'assistant' | 'user'; content: string };
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const priorityOrder: Record<Priority, number> = { alta: 0, media: 1, baja: 2 };
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return dateKey(d); };
const fmtDate = (value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('es-MX', options).format(date);
};
const dayIndexToday = () => (new Date().getDay() + 6) % 7;
const seedTasks: Task[] = [
  { id: 'demo-1', title: 'Terminar ensayo de literatura', subject: 'Literatura', dueDate: addDays(1), priority: 'alta', completed: false },
  { id: 'demo-2', title: 'Resolver guía de funciones', subject: 'Matemáticas', dueDate: addDays(2), priority: 'media', completed: false },
  { id: 'demo-3', title: 'Repasar apuntes de biología', subject: 'Biología', dueDate: addDays(3), priority: 'baja', completed: false },
  { id: 'demo-4', title: 'Leer capítulo 6', subject: 'Historia', dueDate: addDays(4), priority: 'media', completed: true },
];
const seedSchedule: ScheduleItem[] = [
  { id: 'class-1', title: 'Matemáticas', subject: 'Aula 204', dayOfWeek: 0, startTime: '08:00', endTime: '09:00', kind: 'clase' },
  { id: 'class-2', title: 'Literatura', subject: 'Aula 108', dayOfWeek: 0, startTime: '09:15', endTime: '10:15', kind: 'clase' },
  { id: 'class-3', title: 'Biología', subject: 'Laboratorio', dayOfWeek: 1, startTime: '10:00', endTime: '11:30', kind: 'clase' },
  { id: 'class-4', title: 'Club de debate', subject: 'Biblioteca', dayOfWeek: 2, startTime: '14:00', endTime: '15:00', kind: 'actividad' },
  { id: 'class-5', title: 'Historia', subject: 'Aula 301', dayOfWeek: 3, startTime: '08:30', endTime: '09:30', kind: 'clase' },
  { id: 'class-6', title: 'Tutoría de química', subject: 'Aula 112', dayOfWeek: 4, startTime: '12:00', endTime: '13:00', kind: 'actividad' },
];
function readStore<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function usePlannerData() {
  const [tasks, setTasks] = useState<Task[]>(() => readStore('organizate-tasks-v1', seedTasks));
  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => readStore('organizate-schedule-v1', seedSchedule));
  useEffect(() => { localStorage.setItem('organizate-tasks-v1', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('organizate-schedule-v1', JSON.stringify(schedule)); }, [schedule]);
  return { tasks, setTasks, schedule, setSchedule };
}
function App() {
  const data = usePlannerData();
  const [location] = useLocation();
  const [toast, setToast] = useState('');
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(timer); }, [toast]);
  const notify = (message: string) => setToast(message);
  const today = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const activeTitle = location === '/tareas' ? 'Tareas' : location === '/horario' ? 'Horario' : location === '/asistente' ? 'Asistente' : 'Resumen';
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><div className="app-shell">
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="brand"><span className="brand-mark"><GraduationCap size={19}/></span><div><div className="brand-name">Organízate IA</div><div className="brand-sub">Tu espacio de estudio</div></div></div>
      <div className="nav-label">Espacio personal</div><Navigation />
      <div className="sidebar-bottom"><div style={{ display:'flex', alignItems:'center', gap:7, color:'#66796a', fontWeight:700 }}><Sparkles size={13}/> Un día a la vez</div><div style={{ marginTop:5 }}>Un plan claro empieza por lo que sigue.</div></div>
    </aside>
    <div className="main-area">
      <header className="topbar"><div className="topbar-date" data-testid="text-local-date">{today}</div><PwaInstallButton notify={notify}/><div className="topbar-user"><span>Mi espacio</span><span className="user-dot" aria-hidden="true">OE</span></div></header>
      <Switch>
        <Route path="/"><Dashboard tasks={data.tasks} schedule={data.schedule} notify={notify} setTasks={data.setTasks}/></Route>
        <Route path="/tareas"><TasksPage tasks={data.tasks} setTasks={data.setTasks} notify={notify}/></Route>
        <Route path="/horario"><SchedulePage items={data.schedule} setItems={data.setSchedule} notify={notify}/></Route>
        <Route path="/asistente"><AssistantPage tasks={data.tasks} schedule={data.schedule}/></Route>
        <Route><NotFound/></Route>
      </Switch>
    </div>
    <div className="mobile-nav"><Navigation /></div>
    {toast && <div className="toast-note" role="status" data-testid="status-toast">{toast}</div>}
    <span className="sr-only" aria-live="polite">{activeTitle}</span>
  </div></WouterRouter>;
}
function Navigation() {
  const [location] = useLocation();
  const links = [
    { href: '/', label: 'Inicio', icon: LayoutDashboard },
    { href: '/tareas', label: 'Tareas', icon: ListTodo },
    { href: '/horario', label: 'Horario', icon: CalendarDays },
    { href: '/asistente', label: 'Asistente', icon: MessageSquareText },
  ];
  return <nav aria-label="Secciones">{links.map(({ href, label, icon: Icon }) => <Link href={href} key={href} className={`nav-link ${location === href ? 'active' : ''}`} aria-current={location === href ? 'page' : undefined} data-testid={`link-nav-${label.toLowerCase()}`}><Icon size={17}/><span>{label}</span></Link>)}</nav>;
}
function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading" style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:18, marginBottom:27 }}><div><div className="page-kicker">{eyebrow}</div><h1 className="page-title">{title}</h1>{description && <p className="page-intro">{description}</p>}</div>{action}</div>;
}
function Dashboard({ tasks, schedule, notify, setTasks }: { tasks: Task[]; schedule: ScheduleItem[]; notify: (s: string) => void; setTasks: (f: (old: Task[]) => Task[]) => void }) {
  const [, setLocation] = useLocation();
  const pending = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);
  const dueSoon = [...pending].sort((a,b) => a.dueDate.localeCompare(b.dueDate)).slice(0,3);
  const progress = tasks.length ? Math.round(completed.length / tasks.length * 100) : 0;
  const todayIdx = dayIndexToday();
  const todaysSchedule = schedule.filter(item => item.dayOfWeek === todayIdx).sort((a,b) => a.startTime.localeCompare(b.startTime));
  const greeting = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';
  return <main className="page-wrap">
    <PageHeading eyebrow="Tu espacio de estudio" title={`${greeting}, estudiante.`} description="Un vistazo a lo que tienes por delante." action={<button className="btn btn-primary" onClick={() => setLocation('/tareas')} data-testid="button-add-task-dashboard"><Plus size={15}/> Nueva tarea</button>}/>
    <div className="surface" style={{ padding:'22px 25px', marginBottom:19, display:'flex', alignItems:'center', gap:23, flexWrap:'wrap' }} data-testid="card-daily-progress">
      <div style={{ width:51,height:51,borderRadius:'50%',border:'4px solid #e8eee8',borderTopColor:'#5f8068',display:'grid',placeItems:'center',fontSize:11,fontWeight:700,color:'#53715a',transform:'rotate(-30deg)' }}><span style={{transform:'rotate(30deg)'}}>{progress}%</span></div>
      <div style={{ minWidth:150,flex:1 }}><div style={{ fontSize:14,fontWeight:700,color:'#3e4e43' }}>Tu avance de hoy</div><div style={{fontSize:12,color:'#89928a',marginTop:4}}>{completed.length} de {tasks.length} pendientes completados</div></div>
      <div style={{ display:'flex',gap:27,borderLeft:'1px solid #ecece5',paddingLeft:24 }}><Metric label="Por hacer" value={pending.length}/><Metric label="Completadas" value={completed.length}/></div>
    </div>
    <div className="dashboard-grid">
      <section className="surface" aria-labelledby="due-heading">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'19px 20px 12px'}}><div><div className="page-kicker" style={{marginBottom:5}}>Lo que sigue</div><h2 id="due-heading" className="section-heading">Próximas entregas</h2></div><Link href="/tareas" className="btn btn-ghost" data-testid="link-see-all-tasks">Ver todas <ChevronRight size={14}/></Link></div>
        {dueSoon.length ? dueSoon.map(task => <TaskRow key={task.id} task={task} onToggle={() => { setTasks(old => old.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t)); notify(task.completed ? 'Tarea marcada como pendiente.' : 'Tarea completada.'); }} compact/>): <EmptyState icon={<CheckCheck size={18}/>} title="Todo despejado" description="No hay entregas pendientes por ahora."/>}
      </section>
      <section className="surface" aria-labelledby="today-heading">
        <div style={{padding:'19px 20px 12px'}}><div className="page-kicker" style={{marginBottom:5}}>Tu agenda</div><h2 id="today-heading" className="section-heading">Hoy, {DAYS[todayIdx].toLowerCase()}</h2></div>
        {todaysSchedule.length ? <div style={{padding:'0 16px 12px'}}>{todaysSchedule.slice(0,4).map(item=><div key={item.id} style={{display:'flex',gap:11,padding:'10px 3px',borderTop:'1px solid #f0efe9'}}><div style={{fontSize:11,color:'#879188',minWidth:74,paddingTop:1}}>{item.startTime}</div><div><div style={{fontSize:12,fontWeight:700,color:'#46564a'}}>{item.title}</div><div style={{fontSize:10,color:'#959c95',marginTop:3}}>{item.subject}</div></div></div>)}</div>: <EmptyState icon={<CalendarDays size={18}/>} title="Día sin bloques" description="Tu agenda de hoy está libre."/>}
        <div style={{borderTop:'1px solid #f0efe9',padding:'12px 18px'}}><Link href="/horario" className="btn btn-ghost" data-testid="link-open-schedule">Abrir horario <ArrowUpRight size={14}/></Link></div>
      </section>
      <section className="surface" style={{gridColumn:'1 / -1',background:'#f0f4ef',borderColor:'#e5ebe5',padding:'18px 21px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:15,flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:12,alignItems:'center'}}><div className="empty-icon" style={{margin:0,width:39,height:39}}><Sparkles size={17}/></div><div><div style={{fontWeight:700,fontSize:13,color:'#435449'}}>¿No sabes por dónde empezar?</div><div style={{fontSize:11,color:'#78857b',marginTop:4}}>Revisa prioridades y arma un plan corto con el asistente.</div></div></div>
        <Link href="/asistente" className="btn btn-secondary" data-testid="link-open-assistant">Consultar asistente <ChevronRight size={14}/></Link>
      </section>
    </div>
  </main>;
}
function Metric({ label, value }: { label: string; value: number }) { return <div><div style={{fontFamily:'var(--app-font-serif)',fontSize:23,fontWeight:700,color:'#34463a'}} data-testid={`metric-${label.toLowerCase().replace(' ','-')}`}>{value}</div><div style={{fontSize:10,color:'#8b948c',marginTop:2}}>{label}</div></div>; }
function EmptyState({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children?: ReactNode }) { return <div className="empty-state"><div className="empty-icon">{icon}</div><div className="empty-title">{title}</div><div style={{fontSize:12}}>{description}</div>{children}</div>; }
function TaskRow({ task, onToggle, compact = false, onEdit, onDelete }: { task: Task; onToggle: () => void; compact?: boolean; onEdit?: () => void; onDelete?: () => void }) {
  return <div className={`task-row ${task.completed?'task-completed':''}`} data-testid={`row-task-${task.id}`}>
    <input type="checkbox" className="task-check" checked={task.completed} onChange={onToggle} aria-label={`${task.completed?'Marcar pendiente':'Completar'}: ${task.title}`} data-testid={`checkbox-task-${task.id}`}/>
    <div className="task-main"><div className="task-title" data-testid={`text-task-title-${task.id}`}>{task.title}</div><div className="task-meta">{task.subject || 'Sin materia'}{!compact && <> · <span className={`priority priority-${task.priority}`}>{task.priority}</span></>}</div></div>
    <div className="task-date" data-testid={`text-task-date-${task.id}`}>{fmtDate(task.dueDate,{day:'numeric',month:'short'})}</div>
    {!compact && <><button className="icon-button" onClick={onEdit} aria-label={`Editar ${task.title}`} data-testid={`button-edit-task-${task.id}`}><Pencil size={15}/></button><button className="icon-button" onClick={onDelete} aria-label={`Eliminar ${task.title}`} data-testid={`button-delete-task-${task.id}`}><Trash2 size={15}/></button></>}
  </div>;
}
type TaskDraft = Omit<Task, 'id' | 'completed'>;
function TaskDialog({ initial, onClose, onSave }: { initial?: Task; onClose: () => void; onSave: (draft: TaskDraft) => void }) {
  const [title,setTitle]=useState(initial?.title??''); const [subject,setSubject]=useState(initial?.subject??''); const [dueDate,setDueDate]=useState(initial?.dueDate??addDays(1)); const [priority,setPriority]=useState<Priority>(initial?.priority??'media'); const [error,setError]=useState('');
  const submit=(e:FormEvent)=>{e.preventDefault();if(!title.trim()){setError('Escribe el nombre de la tarea.');return}if(!dueDate){setError('Selecciona una fecha de entrega.');return}onSave({title:title.trim(),subject:subject.trim(),dueDate,priority});};
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="task-dialog-title"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><h2 className="modal-title" id="task-dialog-title">{initial?'Editar tarea':'Nueva tarea'}</h2><button className="icon-button" onClick={onClose} aria-label="Cerrar" data-testid="button-close-task-dialog"><X size={17}/></button></div>
    <form onSubmit={submit} noValidate><label className="field-label" htmlFor="task-title">Nombre de la tarea</label><input id="task-title" autoFocus className="field" value={title} onChange={e=>{setTitle(e.target.value);setError('')}} placeholder="Ej. Preparar exposición" data-testid="input-task-title"/>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:13,marginTop:15}}><div><label className="field-label" htmlFor="task-subject">Materia</label><input id="task-subject" className="field" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Opcional" data-testid="input-task-subject"/></div><div><label className="field-label" htmlFor="task-date">Fecha de entrega</label><input id="task-date" type="date" className="field" value={dueDate} onChange={e=>setDueDate(e.target.value)} data-testid="input-task-date"/></div></div>
    <div style={{marginTop:15}}><label className="field-label" htmlFor="task-priority">Prioridad</label><select id="task-priority" className="field" value={priority} onChange={e=>setPriority(e.target.value as Priority)} data-testid="select-task-priority"><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></div>
    {error&&<div className="field-error" role="alert">{error}</div>}<div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={onClose} data-testid="button-cancel-task">Cancelar</button><button className="btn btn-primary" type="submit" data-testid="button-save-task">{initial?'Guardar cambios':'Agregar tarea'}</button></div></form></div></div>;
}
function TasksPage({ tasks, setTasks, notify }: { tasks: Task[]; setTasks: (f: (old: Task[])=>Task[])=>void; notify: (s:string)=>void }) {
  const [filter,setFilter]=useState<'todas'|'pendientes'|'completadas'>('todas'); const [priorityFilter,setPriorityFilter]=useState<'todas'|Priority>('todas'); const [dialog,setDialog]=useState<Task|null|false>(false);
  const filtered=useMemo(()=>tasks.filter(t=>(filter==='todas'||(filter==='pendientes'?!t.completed:t.completed))&&(priorityFilter==='todas'||t.priority===priorityFilter)).sort((a,b)=>Number(a.completed)-Number(b.completed)||priorityOrder[a.priority]-priorityOrder[b.priority]||a.dueDate.localeCompare(b.dueDate)),[tasks,filter,priorityFilter]);
  const toggle=(id:string)=>setTasks(old=>old.map(t=>t.id===id?{...t,completed:!t.completed}:t));
  const save=(draft:TaskDraft)=>{if(dialog&&typeof dialog==='object'){setTasks(old=>old.map(t=>t.id===dialog.id?{...t,...draft}:t));notify('Cambios guardados.')}else{setTasks(old=>[{...draft,id:crypto.randomUUID(),completed:false},...old]);notify('Tarea agregada.')}setDialog(false)};
  const remove=(task:Task)=>{if(window.confirm(`¿Eliminar “${task.title}”? Esta acción no se puede deshacer.`)){setTasks(old=>old.filter(t=>t.id!==task.id));notify('Tarea eliminada.')}};
  return <main className="page-wrap"><PageHeading eyebrow="Organiza tus pendientes" title="Tareas" description="Todo lo que tienes que hacer, en un solo lugar." action={<button className="btn btn-primary" onClick={()=>setDialog(null)} data-testid="button-add-task"><Plus size={15}/> Agregar tarea</button>}/>
    <div className="surface" style={{overflow:'hidden'}}><div style={{padding:'14px 17px',borderBottom:'1px solid #f0efe9',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
      <div style={{display:'flex',gap:5}}>{(['todas','pendientes','completadas'] as const).map(item=><button key={item} className={`btn ${filter===item?'btn-secondary':'btn-ghost'}`} onClick={()=>setFilter(item)} data-testid={`filter-tasks-${item}`}>{item[0].toUpperCase()+item.slice(1)} <span style={{opacity:.7}}>{item==='todas'?tasks.length:item==='pendientes'?tasks.filter(t=>!t.completed).length:tasks.filter(t=>t.completed).length}</span></button>)}</div>
      <select className="field" style={{width:'auto',minWidth:130,padding:'8px 10px'}} aria-label="Filtrar por prioridad" value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value as typeof priorityFilter)} data-testid="select-filter-priority"><option value="todas">Todas prioridades</option><option value="alta">Prioridad alta</option><option value="media">Prioridad media</option><option value="baja">Prioridad baja</option></select>
    </div>
    {filtered.length?filtered.map(task=><TaskRow key={task.id} task={task} onToggle={()=>toggle(task.id)} onEdit={()=>setDialog(task)} onDelete={()=>remove(task)}/>):<EmptyState icon={<ListTodo size={19}/>} title={tasks.length?'Sin resultados':'Tu lista empieza aquí'} description={tasks.length?'Prueba con otro filtro o agrega una tarea.':'Agrega tus pendientes y dales una fecha y prioridad.'}><button className="btn btn-secondary" style={{marginTop:14}} onClick={()=>setDialog(null)} data-testid="button-empty-add-task"><Plus size={14}/> Agregar tarea</button></EmptyState>}
    </div>{dialog!==false&&<TaskDialog initial={dialog||undefined} onClose={()=>setDialog(false)} onSave={save}/>}</main>;
}
type ScheduleDraft=Omit<ScheduleItem,'id'>;
function ScheduleDialog({ initial,onClose,onSave }: {initial?:ScheduleItem;onClose:()=>void;onSave:(draft:ScheduleDraft)=>void}) {
  const [title,setTitle]=useState(initial?.title??'');const[subject,setSubject]=useState(initial?.subject??'');const[day,setDay]=useState(String(initial?.dayOfWeek??dayIndexToday()));const[start,setStart]=useState(initial?.startTime??'08:00');const[end,setEnd]=useState(initial?.endTime??'09:00');const[kind,setKind]=useState<'clase'|'actividad'>(initial?.kind??'clase');const[error,setError]=useState('');
  const submit=(e:FormEvent)=>{e.preventDefault();if(!title.trim()){setError('Escribe el nombre de la clase o actividad.');return}if(start>=end){setError('La hora de término debe ser posterior al inicio.');return}onSave({title:title.trim(),subject:subject.trim(),dayOfWeek:Number(day),startTime:start,endTime:end,kind})};
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="schedule-dialog-title"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><h2 className="modal-title" id="schedule-dialog-title">{initial?'Editar bloque':'Nuevo bloque'}</h2><button className="icon-button" onClick={onClose} aria-label="Cerrar" data-testid="button-close-schedule-dialog"><X size={17}/></button></div>
    <form onSubmit={submit} noValidate><label className="field-label" htmlFor="schedule-title">Nombre</label><input id="schedule-title" autoFocus className="field" value={title} onChange={e=>{setTitle(e.target.value);setError('')}} placeholder="Ej. Química" data-testid="input-schedule-title"/>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:13,marginTop:15}}><div><label className="field-label" htmlFor="schedule-subject">Aula o detalle</label><input id="schedule-subject" className="field" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Opcional" data-testid="input-schedule-subject"/></div><div><label className="field-label" htmlFor="schedule-kind">Tipo</label><select id="schedule-kind" className="field" value={kind} onChange={e=>setKind(e.target.value as typeof kind)} data-testid="select-schedule-kind"><option value="clase">Clase</option><option value="actividad">Actividad</option></select></div></div>
    <div style={{marginTop:15}}><label className="field-label" htmlFor="schedule-day">Día</label><select id="schedule-day" className="field" value={day} onChange={e=>setDay(e.target.value)} data-testid="select-schedule-day">{DAYS.map((d,i)=><option value={i} key={d}>{d}</option>)}</select></div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:13,marginTop:15}}><div><label className="field-label" htmlFor="schedule-start">Hora de inicio</label><input id="schedule-start" type="time" className="field" value={start} onChange={e=>setStart(e.target.value)} data-testid="input-schedule-start"/></div><div><label className="field-label" htmlFor="schedule-end">Hora de término</label><input id="schedule-end" type="time" className="field" value={end} onChange={e=>setEnd(e.target.value)} data-testid="input-schedule-end"/></div></div>
    {error&&<div className="field-error" role="alert">{error}</div>}<div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={onClose} data-testid="button-cancel-schedule">Cancelar</button><button className="btn btn-primary" type="submit" data-testid="button-save-schedule">Guardar bloque</button></div></form></div></div>;
}
function SchedulePage({items,setItems,notify}:{items:ScheduleItem[];setItems:(f:(old:ScheduleItem[])=>ScheduleItem[])=>void;notify:(s:string)=>void}) {
  const[dialog,setDialog]=useState<ScheduleItem|null|false>(false);
  const save=(draft:ScheduleDraft)=>{if(dialog&&typeof dialog==='object'&&dialog.id){setItems(old=>old.map(i=>i.id===dialog.id?{...draft,id:i.id}:i));notify('Bloque actualizado.')}else{setItems(old=>[...old,{...draft,id:crypto.randomUUID()}]);notify('Bloque agregado al horario.')}setDialog(false)};
  const remove=(item:ScheduleItem)=>{if(window.confirm(`¿Eliminar “${item.title}” del horario?`)){setItems(old=>old.filter(i=>i.id!==item.id));notify('Bloque eliminado.')}};
  const today=dayIndexToday();
  return <main className="page-wrap"><PageHeading eyebrow="Tu semana, con espacio para todo" title="Horario" description="Clases y actividades organizadas de lunes a domingo." action={<button className="btn btn-primary" onClick={()=>setDialog(null)} data-testid="button-add-schedule"><Plus size={15}/> Nuevo bloque</button>}/>
    <div className="surface" style={{padding:14,overflowX:'auto'}}><div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(118px,1fr))',minWidth:840}}>
      {DAYS.map((day,index)=>{const dayItems=items.filter(i=>i.dayOfWeek===index).sort((a,b)=>a.startTime.localeCompare(b.startTime));return <div key={day} className="day-column" style={{borderRight:index<6?'1px solid #efeee8':0,minHeight:330}} data-testid={`column-schedule-day-${index}`}><div style={{padding:'9px 8px 13px',borderBottom:'1px solid #eeede7',marginBottom:6}}><div style={{fontSize:11,fontWeight:700,color:index===today?'#486e59':'#626e65'}}>{day}</div><div style={{fontSize:10,color:'#9aa198',marginTop:4}}>{dayIndexToday()===index?'Hoy':`${dayItems.length} ${dayItems.length===1?'bloque':'bloques'}`}</div></div>
        {dayItems.map(item=><article className={`schedule-item ${item.kind==='actividad'?'activity':''}`} key={item.id} data-testid={`card-schedule-${item.id}`}><div style={{display:'flex',justifyContent:'space-between',gap:4}}><div className="schedule-time">{item.startTime} — {item.endTime}</div><div style={{display:'flex',gap:0,marginTop:-5,marginRight:-5}}><button className="icon-button" style={{width:23,height:23}} onClick={()=>setDialog(item)} aria-label={`Editar ${item.title}`} data-testid={`button-edit-schedule-${item.id}`}><Pencil size={11}/></button><button className="icon-button" style={{width:23,height:23}} onClick={()=>remove(item)} aria-label={`Eliminar ${item.title}`} data-testid={`button-delete-schedule-${item.id}`}><Trash2 size={11}/></button></div></div><div className="schedule-title">{item.title}</div>{item.subject&&<div className="schedule-subject">{item.subject}</div>}</article>)}
        {dayItems.length===0&&<button className="btn btn-ghost" style={{width:'calc(100% - 8px)',margin:'6px 4px',fontSize:10,padding:'8px 5px'}} onClick={()=>setDialog({...({title:'',subject:'',dayOfWeek:index,startTime:'08:00',endTime:'09:00',kind:'clase',id:''} as ScheduleItem)})} data-testid={`button-add-day-${index}`}><Plus size={12}/> Agregar</button>}
      </div>})}
    </div></div>
    <div style={{display:'flex',gap:18,alignItems:'center',padding:'15px 4px',fontSize:11,color:'#879087'}}><span style={{display:'flex',alignItems:'center',gap:6}}><i style={{width:8,height:8,borderRadius:3,background:'#719078'}}/> Clase</span><span style={{display:'flex',alignItems:'center',gap:6}}><i style={{width:8,height:8,borderRadius:3,background:'#bc9a68'}}/> Actividad</span><span style={{marginLeft:'auto'}}>Selecciona una tarjeta para editar o eliminar.</span></div>
    {dialog!==false&&<ScheduleDialog initial={dialog||undefined} onClose={()=>setDialog(false)} onSave={save}/>}</main>;
}
function makeAssistantReply(message:string,tasks:Task[],schedule:ScheduleItem[]) {
  const text=message.trim().toLocaleLowerCase('es');
  if(!text)return 'Escríbeme qué tienes en mente y lo vemos con calma. Puedes preguntarme qué priorizar o pedirme un plan para hoy.';
  const pending=sortStudyTasks(tasks);
  if(!pending.length)return 'Tu lista no tiene tareas pendientes. Buen momento para descansar o anotar lo próximo que necesites hacer.';
  const wantsPlan=/plan|organiza|organizar|hoy|por dónde|por donde|agenda|tiempo|empezar/.test(text);
  const wantsPriority=/prior|urgente|primero|importante|qué hago|que hago|recomienda/.test(text);
  if(wantsPlan){
    const plan=createTodayStudyPlan(tasks,schedule);
    const lines=plan.blocks.map((block,index)=>`${index+1}. ${block.task.title} — ${block.focusMinutes} min · ${block.task.priority} · ${block.dueLabel}`);
    const overflow=plan.remainingTaskCount?`\n\nDejé ${plan.remainingTaskCount} tarea(s) más fuera de este plan corto; puedes generar otro plan después de actualizar tus pendientes.`:'';
    const missing=plan.missingDueDateCount?`\n\nFalta fecha de entrega en ${plan.missingDueDateCount} tarea(s), así que no puedo calcular su urgencia con precisión.`:'';
    return `${plan.emptyMessage??`Preparé ${plan.blocks.length} bloque(s) iniciales para hoy, con pasos concretos y pausas entre tareas:\n${lines.join('\n')}\n\n${plan.availabilityNote}${overflow}${missing}`}\n\nEl detalle de cada paso está en el plan de estudio de esta página.`;
  }
  const intro=wantsPriority?'Según la prioridad y la fecha que registraste, empezaría por esto:':wantsPlan?'Con tus pendientes actuales, este podría ser un plan manejable:':'Revisé tus pendientes guardados. Esto es lo más próximo según prioridad y fecha:';
  const chosen=pending.slice(0,4);
  const lines=chosen.map((task,index)=>`${index+1}. ${task.title} — ${task.subject||'sin materia'} · prioridad ${task.priority} · ${taskDueLabel(task)}`);
  const finish='\n\nTomé en cuenta la urgencia de la fecha registrada y después la prioridad. Si falta una fecha, no puedo estimar esa urgencia.';
  const response=`${intro}\n${lines.join('\n')}${finish}`;
  return `${response}\n\nNota: soy una demostración local basada en tus tareas; no uso un modelo de IA ni envío tus datos a ningún servicio.`;
}
function AssistantPage({tasks,schedule}:{tasks:Task[];schedule:ScheduleItem[]}) {
  const[messages,setMessages]=useState<ChatMessage[]>([{role:'assistant',content:'Hola. Puedo ayudarte a ordenar tus pendientes con reglas sencillas: primero considero la prioridad que elegiste y después la fecha de entrega.\n\nEsta es una demostración local, no está conectada a un modelo de IA ni a servicios externos. Tus datos se quedan en este dispositivo.'}]);
  const[input,setInput]=useState('');
  const[studyPlan,setStudyPlan]=useState<TodayStudyPlan|null>(null);
  const planRevision=getStudyPlanRevision(tasks,schedule);
  const isPlanStale=studyPlan!==null&&studyPlan.revision!==planRevision;
  const generatePlan=()=>setStudyPlan(createTodayStudyPlan(tasks,schedule));
  const send=(value=input)=>{const clean=value.trim();if(!clean){setMessages(old=>[...old,{role:'assistant',content:makeAssistantReply('',tasks,schedule)}]);setInput('');return}if(/plan|organiza|organizar|hoy|agenda/.test(clean.toLocaleLowerCase('es')))generatePlan();setMessages(old=>[...old,{role:'user',content:clean},{role:'assistant',content:makeAssistantReply(clean,tasks,schedule)}]);setInput('')};
  return <main className="page-wrap" style={{maxWidth:900}}><PageHeading eyebrow="Una guía para el siguiente paso" title="Asistente" description="Ordena tus ideas y encuentra una forma de empezar." action={<button className="btn btn-primary" onClick={generatePlan} data-testid="button-generate-study-plan"><RefreshCw size={14}/>{studyPlan?'Volver a generar plan':'Generar plan de hoy'}</button>}/>
    {studyPlan&&<StudyPlanCard plan={studyPlan} isStale={isPlanStale} onRegenerate={generatePlan}/>}
    <section className="surface" style={{overflow:'hidden',minHeight:470,display:'flex',flexDirection:'column'}} aria-label="Chat de asistencia">
      <div style={{padding:'14px 18px',borderBottom:'1px solid #efeee8',display:'flex',alignItems:'center',gap:10}}><div className="empty-icon" style={{margin:0,width:34,height:34,borderRadius:11}}><Sparkles size={16}/></div><div><div style={{fontSize:12,fontWeight:700,color:'#45564a'}}>Guía de estudio</div><div style={{fontSize:10,color:'#8a938b',marginTop:3}}>Respuestas con reglas locales</div></div><span style={{marginLeft:'auto',fontSize:10,color:'#879187',display:'flex',gap:5,alignItems:'center'}}><CircleHelp size={13}/> Sin conexión a IA</span></div>
      <div style={{padding:'21px 18px',display:'flex',flexDirection:'column',gap:14,flex:1,overflowY:'auto',maxHeight:450}} aria-live="polite" data-testid="chat-message-list">{messages.map((m,index)=><div key={`${index}-${m.role}`} className={`chat-message ${m.role==='user'?'chat-user':'chat-assistant'}`} data-testid={`chat-message-${index}`}>{m.content}</div>)}</div>
      <div style={{padding:'0 18px 13px',display:'flex',gap:8,flexWrap:'wrap'}}>{['¿Qué debería priorizar?','Ayúdame a organizar un plan para hoy'].map((suggestion,i)=><button key={suggestion} className="btn btn-ghost" style={{border:'1px solid #e9ebe4',fontSize:10}} onClick={()=>send(suggestion)} data-testid={`button-suggestion-${i}`}>{suggestion}</button>)}</div>
      <form onSubmit={e=>{e.preventDefault();send()}} style={{display:'flex',gap:9,padding:'13px 16px',borderTop:'1px solid #efeee8',background:'#fcfcfa'}}><input className="field" value={input} onChange={e=>setInput(e.target.value)} placeholder="Escribe tu pregunta…" aria-label="Tu mensaje" data-testid="input-chat-message"/><button type="submit" className="btn btn-primary" aria-label="Enviar mensaje" data-testid="button-send-message"><Send size={15}/></button></form>
      <div style={{padding:'0 17px 13px',fontSize:10,color:'#99a098',textAlign:'center'}}>No se envía información a ningún servicio. Las respuestas usan solo tus tareas guardadas aquí.</div>
    </section>
  </main>;
}
function StudyPlanCard({plan,isStale,onRegenerate}:{plan:TodayStudyPlan;isStale:boolean;onRegenerate:()=>void}) {
  return <section className="surface study-plan" aria-labelledby="study-plan-title" data-testid="card-today-study-plan">
    <div className="study-plan-header"><div><div className="page-kicker" style={{marginBottom:5}}>Plan local · {plan.dateLabel}</div><h2 id="study-plan-title" className="section-heading">Tu plan de estudio para hoy</h2></div><span className="study-plan-count">{plan.blocks.length} {plan.blocks.length===1?'bloque':'bloques'}</span></div>
    {isStale&&<div className="study-plan-stale" role="status"><CircleAlert size={15}/> Tus tareas o tu horario cambiaron. Vuelve a generar el plan para actualizarlo.</div>}
    {plan.emptyMessage?<div className="study-plan-empty">{plan.emptyMessage}</div>:<>
      <div className="study-plan-note"><CircleAlert size={16}/><span>{plan.availabilityNote}</span></div>
      {plan.missingDueDateCount>0&&<div className="study-plan-missing">Falta fecha de entrega en {plan.missingDueDateCount} tarea(s); esas fechas no se estimaron y quedaron después de las tareas con entrega registrada.</div>}
      <div className="study-plan-blocks">{plan.blocks.map((block,index)=><div className="study-plan-sequence" key={block.task.id}>
        <article className="study-plan-block" data-testid={`study-plan-block-${block.task.id}`}>
          <div className="study-plan-block-top"><span className="study-plan-index">{String(index+1).padStart(2,'0')}</span><div className="study-plan-task"><h3>{block.task.title}</h3><div className="study-plan-meta">{block.task.subject||'Sin materia'} · <span className={`priority priority-${block.task.priority}`}>{block.task.priority}</span> · {block.dueLabel}</div></div><span className="study-plan-duration"><Clock3 size={13}/>{block.focusMinutes} min</span></div>
          <ol className="study-plan-steps">{block.steps.map((step,stepIndex)=><li key={stepIndex}>{step}</li>)}</ol>
        </article>
        {block.breakAfterMinutes&&<div className="study-plan-break"><Coffee size={13}/> Pausa sugerida · {block.breakAfterMinutes} min</div>}
      </div>)}</div>
      {plan.remainingTaskCount>0&&<p className="study-plan-overflow">Hay {plan.remainingTaskCount} tarea(s) más pendientes. Dejé espacio para que este plan inicial siga siendo manejable.</p>}
      <p className="study-plan-footnote">Los bloques son sugerencias iniciales; no indican cuánto tardará en terminarse cada tarea.</p>
    </>}
    <div className="study-plan-footer"><span>Demostración local: usa solo tus tareas y horario guardados en este dispositivo.</span><button className="btn btn-secondary" onClick={onRegenerate} data-testid="button-regenerate-study-plan"><RefreshCw size={13}/> Actualizar plan</button></div>
  </section>;
}
function NotFound() { return <main className="page-wrap"><PageHeading eyebrow="Página no encontrada" title="Este camino no está en tu mapa." description="La página que buscas no existe o cambió de lugar."/><Link href="/" className="btn btn-primary" data-testid="link-return-home">Volver al inicio</Link></main>; }
export default App;
