import { logger } from '../utils/logger.js';

export type ScheduledTask = {
  id: string;
  name: string;
  run: () => Promise<number> | number;
};

export class Scheduler {
  private timers = new Map<string, NodeJS.Timeout>();
  private running = false;

  start(tasks: ScheduledTask[]) {
    this.running = true;
    for (const task of tasks) {
      this.schedule(task, 0);
    }
  }

  stop(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  stopAll() {
    for (const id of this.timers.keys()) {
      this.stop(id);
    }
    this.running = false;
  }

  private schedule(task: ScheduledTask, delayMs: number) {
    if (!this.running) return;
    const timer = setTimeout(async () => {
      try {
        const nextDelay = await task.run();
        this.schedule(task, nextDelay);
      } catch (error) {
        logger.error(`Scheduler task ${task.name} failed`, error);
        this.schedule(task, Math.max(5000, delayMs));
      }
    }, delayMs);
    this.timers.set(task.id, timer);
  }
}
