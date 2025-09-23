import { describe, it, expect } from 'vitest';
import { EventEmitter, createAsyncIterator } from '@/utils/emitter';

describe('eventEmitter', () => {
  it('should emit and resolve events', async () => {
    const emitter = new EventEmitter<[number], string>();
    let receivedData: number | undefined;
    let receivedEventId: string | undefined;

    emitter.subscribe((data, eventId) => {
      receivedData = data[0];
      receivedEventId = eventId;
      emitter.resolve(eventId)('done');
    });

    const promise = emitter.emit(42);
    const result = await promise;

    expect(receivedData).toBe(42);
    expect(typeof receivedEventId).toBe('string');
    expect(result).toBe('done');
  });

  it('should support multiple listeners', async () => {
    const emitter = new EventEmitter<[string], boolean>();
    const calls: Array<{ data: string; eventId: string }> = [];

    emitter.subscribe((data, eventId) => {
      calls.push({ data: data[0], eventId });
    });
    emitter.subscribe((data, eventId) => {
      calls.push({ data: data[0], eventId });
    });
    // Add a third listener to resolve after all listeners are called
    emitter.subscribe((_, eventId) => {
      emitter.resolve(eventId)(true);
    });

    const result = await emitter.emit('test');
    expect(result).toBeTruthy();
    expect(calls).toHaveLength(2);
    expect(calls[0].data).toBe('test');
    expect(calls[0].eventId).toBe(calls[1].eventId);
  });

  it('should queue events if no listeners', async () => {
    const emitter = new EventEmitter<[number], string>();
    const promise = emitter.emit(1);

    let called = false;
    emitter.subscribe((_, eventId) => {
      called = true;
      emitter.resolve(eventId)('ok');
    });

    const result = await promise;
    expect(called).toBeTruthy();
    expect(result).toBe('ok');
  });

  it('should resolve only once per eventId', async () => {
    const emitter = new EventEmitter<[string], string>();

    emitter.subscribe((_, eventId) => {
      const resolver = emitter.resolve(eventId);
      resolver('first');
      resolver('second');
    });

    const result = await emitter.emit('foo');
    expect(result).toBe('first');
  });

  it('waitForEvent should resolve immediately if event is queued', async () => {
    const emitter = new EventEmitter<[number], string>();
    void emitter.emit(123); // queues event

    const event = await emitter.waitForEvent();
    expect(event.data[0]).toBe(123);
    expect(typeof event.eventId).toBe('string');
  });

  it('waitForEvent should wait for new events', async () => {
    const emitter = new EventEmitter<[string], number>();

    setTimeout(() => {
      void emitter.emit('delayed');
    }, 10);

    const event = await emitter.waitForEvent();
    expect(event.data[0]).toBe('delayed');
  });
});

describe('createAsyncIterator', () => {
  it('should yield events as they are emitted', async () => {
    const emitter = new EventEmitter<[number], void>();
    const iterator = createAsyncIterator(emitter);

    setTimeout(() => {
      void emitter.emit(1);
      void emitter.emit(2);
    }, 5);

    const first = await iterator.next();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(first.value.data[0]).toBe(1);

    const second = await iterator.next();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(second.value.data[0]).toBe(2);
  });
});
