export type StudyPriority = 'alta' | 'media' | 'baja';

export type StudyTask = {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  priority: StudyPriority;
  completed: boolean;
};

export type StudyScheduleItem = {
  id: string;
  title: string;
  subject: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  kind: 'clase' | 'actividad';
};

export type StudyPlanBlock = {
  task: StudyTask;
  dueLabel: string;
  focusMinutes: number;
  breakAfterMinutes: number | null;
  steps: string[];
};

export type TodayStudyPlan = {
  dateLabel: string;
  revision: string;
  schedule: StudyScheduleItem[];
  availabilityNote: string;
  blocks: StudyPlanBlock[];
  remainingTaskCount: number;
  missingDueDateCount: number;
  emptyMessage: string | null;
};

const priorityOrder: Record<StudyPriority, number> = {
  alta: 0,
  media: 1,
  baja: 2,
};

const MAX_DAILY_BLOCKS = 4;
const FOCUS_MINUTES = 25;

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const time = Date.UTC(year, month - 1, day);
  return new Date(time).toISOString().slice(0, 10) === value ? time : null;
}

function daysUntilDue(dueDate: string, today: Date) {
  const due = dateValue(dueDate);
  const current = dateValue(dateKey(today));
  if (due === null || current === null) return null;
  return Math.round((due - current) / 86_400_000);
}

function urgencyOrder(task: StudyTask, today: Date) {
  const days = daysUntilDue(task.dueDate, today);
  if (days === null) return 5;
  if (days < 0) return 0;
  if (days === 0) return 1;
  if (days <= 2) return 2;
  if (days <= 7) return 3;
  return 4;
}

export function sortStudyTasks(tasks: StudyTask[], today = new Date()) {
  return tasks
    .filter((task) => !task.completed)
    .slice()
    .sort((a, b) =>
      urgencyOrder(a, today) - urgencyOrder(b, today) ||
      priorityOrder[a.priority] - priorityOrder[b.priority] ||
      (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31') ||
      a.id.localeCompare(b.id),
    );
}

export function taskDueLabel(task: StudyTask, today = new Date()) {
  const days = daysUntilDue(task.dueDate, today);
  if (days === null) return 'Sin fecha de entrega registrada';

  const date = new Date(`${task.dueDate}T12:00:00`);
  const label = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  }).format(date);

  if (days < 0) return `Vencida · ${label}`;
  if (days === 0) return `Entrega hoy · ${label}`;
  if (days === 1) return `Entrega mañana · ${label}`;
  return `Entrega ${label} · en ${days} días`;
}

export function getStudyPlanRevision(
  tasks: StudyTask[],
  schedule: StudyScheduleItem[],
  today = new Date(),
) {
  const dayOfWeek = (today.getDay() + 6) % 7;
  return JSON.stringify({
    day: dateKey(today),
    tasks: tasks.map(({ id, title, subject, dueDate, priority, completed }) => ({
      id, title, subject, dueDate, priority, completed,
    })),
    schedule: schedule
      .filter((item) => item.dayOfWeek === dayOfWeek)
      .map(({ id, title, subject, startTime, endTime, kind }) => ({
        id, title, subject, startTime, endTime, kind,
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  });
}

export function createTodayStudyPlan(
  tasks: StudyTask[],
  schedule: StudyScheduleItem[],
  today = new Date(),
): TodayStudyPlan {
  const dayOfWeek = (today.getDay() + 6) % 7;
  const todaysSchedule = schedule
    .filter((item) => item.dayOfWeek === dayOfWeek)
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const pending = sortStudyTasks(tasks, today);
  const selected = pending.slice(0, MAX_DAILY_BLOCKS);
  const missingDueDateCount = pending.filter((task) => daysUntilDue(task.dueDate, today) === null).length;

  const availabilityNote = todaysSchedule.length
    ? `Tu horario registra hoy: ${todaysSchedule.map((item) => `${item.title}, ${item.startTime}–${item.endTime}`).join('; ')}. No registra tus horas libres de estudio, así que no asigno una hora exacta a estos bloques.`
    : 'No hay bloques de horario registrados para hoy. Como tampoco tengo una hora de inicio o disponibilidad para estudiar, propongo duraciones sin asignarles horas del reloj.';

  return {
    dateLabel: new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(today),
    revision: getStudyPlanRevision(tasks, schedule, today),
    schedule: todaysSchedule,
    availabilityNote,
    blocks: selected.map((task, index) => ({
      task,
      dueLabel: taskDueLabel(task, today),
      focusMinutes: FOCUS_MINUTES,
      breakAfterMinutes:
        index === 2 && selected.length > 3
          ? 15
          : index < selected.length - 1
            ? 5
            : null,
      steps: [
        task.subject
          ? `Abre la consigna y reúne lo que ya tienes de ${task.subject}.`
          : 'Abre la consigna y reúne los materiales que ya tienes.',
        'Elige una parte concreta de esta tarea para avanzar durante este bloque.',
        'Guarda el avance y anota qué falta para continuar después.',
      ],
    })),
    remainingTaskCount: Math.max(0, pending.length - selected.length),
    missingDueDateCount,
    emptyMessage: pending.length
      ? null
      : 'No hay tareas pendientes guardadas. Agrega una tarea para que pueda preparar un plan de estudio.',
  };
}
