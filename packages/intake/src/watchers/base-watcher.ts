import { logger } from '@asc/shared';

export interface WatcherOptions {
  pollIntervalMs?: number;
  name: string;
}

export abstract class BaseWatcher {
  protected readonly name: string;
  protected readonly pollIntervalMs: number;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: WatcherOptions) {
    this.name = options.name;
    this.pollIntervalMs = options.pollIntervalMs ?? 60_000;
  }

  async start(): Promise<void> {
    this.running = true;
    logger.info({ watcher: this.name, pollIntervalMs: this.pollIntervalMs }, 'Watcher starting');

    // Initial poll
    await this.safePoll();

    // Schedule recurring polls
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    logger.info({ watcher: this.name }, 'Watcher stopped');
  }

  private scheduleNext(): void {
    if (!this.running) return;
    this.timer = setTimeout(async () => {
      await this.safePoll();
      this.scheduleNext();
    }, this.pollIntervalMs);
  }

  private async safePoll(): Promise<void> {
    try {
      await this.poll();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ watcher: this.name, error: errorMsg }, 'Watcher poll failed');
    }
  }

  protected abstract poll(): Promise<void>;
}
