import { EventEmitter } from 'node:events';
import type { PipelineEvent, PipelineEventPayloads } from './types.js';

export interface EventBus {
  emit<E extends PipelineEvent>(event: E, payload: PipelineEventPayloads[E]): void;
  on<E extends PipelineEvent>(event: E, handler: (payload: PipelineEventPayloads[E]) => void): void;
  off<E extends PipelineEvent>(event: E, handler: (payload: PipelineEventPayloads[E]) => void): void;
  once<E extends PipelineEvent>(event: E, handler: (payload: PipelineEventPayloads[E]) => void): void;
}

export function createEventBus(): EventBus {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(50);

  return {
    emit(event, payload) {
      emitter.emit(event, payload);
    },
    on(event, handler) {
      emitter.on(event, handler);
    },
    off(event, handler) {
      emitter.off(event, handler);
    },
    once(event, handler) {
      emitter.once(event, handler);
    },
  };
}
