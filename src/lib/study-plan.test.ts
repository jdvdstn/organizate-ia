import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createTodayStudyPlan,
  getStudyPlanRevision,
  sortStudyTasks,
  taskDueLabel,
  type StudyScheduleItem,
  type StudyTask,
} from './study-plan.js';

const today = new Date(2026, 10, 11, 12);
const makeTask = (
  id: string,
  dueDate: string,
  priority: StudyTask['priority'],
  completed = false,
): StudyTask => ({
  id,
  title: `Tarea ${id}`,
  subject: 'Literatura',
  dueDate,
  priority,
  completed,
});

test('ordena primero vencidas y cercanas, usa prioridad y deja sin fecha al final', () => {
  const tasks = [
    makeTask('later', '2026-11-21', 'alta'),
    makeTask('tomorrow', '2026-11-12', 'baja'),
    makeTask('overdue', '2026-11-10', 'baja'),
    makeTask('today-high', '2026-11-11', 'alta'),
    makeTask('missing', '', 'alta'),
    makeTask('done', '2026-11-11', 'alta', true),
  ];

  assert.deepEqual(
    sortStudyTasks(tasks, today).map((task) => task.id),
    ['overdue', 'today-high', 'tomorrow', 'later', 'missing'],
  );
  assert.equal(taskDueLabel(tasks[4], today), 'Sin fecha de entrega registrada');
});

test('genera pasos, descansos y avisa cuando el horario no permite calcular horas libres', () => {
  const tasks = Array.from({ length: 6 }, (_, index) =>
    makeTask(`task-${index}`, '2026-11-13', 'media'),
  );
  const plan = createTodayStudyPlan(tasks, [], today);

  assert.equal(plan.blocks.length, 4);
  assert.equal(plan.remainingTaskCount, 2);
  assert.deepEqual(plan.blocks.map((block) => block.breakAfterMinutes), [5, 5, 15, null]);
  assert.equal(plan.blocks[0].focusMinutes, 25);
  assert.equal(plan.blocks[0].steps.length, 3);
  assert.match(plan.availabilityNote, /No hay bloques de horario registrados/);
  assert.match(plan.availabilityNote, /sin asignarles horas del reloj/);
});

test('usa solo los bloques de hoy y no inventa una hora de estudio', () => {
  const todaysSchedule: StudyScheduleItem[] = [{
    id: 'class-today',
    title: 'Matemáticas',
    subject: 'Aula 204',
    dayOfWeek: 2,
    startTime: '08:00',
    endTime: '09:00',
    kind: 'clase',
  }];
  const plan = createTodayStudyPlan([makeTask('today', '2026-11-12', 'alta')], todaysSchedule, today);

  assert.equal(plan.schedule.length, 1);
  assert.match(plan.availabilityNote, /Matemáticas, 08:00–09:00/);
  assert.match(plan.availabilityNote, /no asigno una hora exacta/);
});

test('maneja listas vacías y detecta cambios en tareas y horario', () => {
  const noTasksPlan = createTodayStudyPlan([], [], today);
  assert.equal(noTasksPlan.blocks.length, 0);
  assert.match(noTasksPlan.emptyMessage ?? '', /No hay tareas pendientes/);

  const tasks = [makeTask('task', '2026-11-12', 'alta')];
  const originalRevision = getStudyPlanRevision(tasks, [], today);
  const changedRevision = getStudyPlanRevision(
    [{ ...tasks[0], priority: 'baja' }],
    [],
    today,
  );
  assert.notEqual(originalRevision, changedRevision);
  const todaySchedule: StudyScheduleItem[] = [{
    id: 'class',
    title: 'Matemáticas',
    subject: '',
    dayOfWeek: 2,
    startTime: '08:00',
    endTime: '09:00',
    kind: 'clase',
  }];
  assert.notEqual(getStudyPlanRevision(tasks, todaySchedule, today), originalRevision);
  assert.equal(
    createTodayStudyPlan([{ ...tasks[0], dueDate: 'invalid-date' }], [], today).missingDueDateCount,
    1,
  );
});
