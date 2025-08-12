/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

export function disableAsyncGlobals() {
  const g = globalThis as any;

  // Avoid double patching
  if (g.__dryAsyncPatched) {
    return () => {};
  }
  g.__dryAsyncPatched = true;

  const originals = {
    setTimeout: g.setTimeout,
    clearTimeout: g.clearTimeout,
    setInterval: g.setInterval,
    clearInterval: g.clearInterval,
    requestAnimationFrame: g.requestAnimationFrame,
    cancelAnimationFrame: g.cancelAnimationFrame,
    requestIdleCallback: g.requestIdleCallback,
    cancelIdleCallback: g.cancelIdleCallback,
    fetch: g.fetch,
    WebSocket: g.WebSocket,
    sendBeacon: g.navigator?.sendBeacon,
  } as const;

  // Timers → no-op ids
  const fakeId = (() => {
    let n = 1;
    return () => n++;
  })();

  // --- timers/raf/idle ---
  if (typeof g.setTimeout === 'function')
    g.setTimeout = (() => fakeId()) as any;
  if (typeof g.clearTimeout === 'function') g.clearTimeout = (() => {}) as any;

  if (typeof g.setInterval === 'function')
    g.setInterval = (() => fakeId()) as any;
  if (typeof g.clearInterval === 'function')
    g.clearInterval = (() => {}) as any;

  if (typeof g.requestAnimationFrame === 'function')
    g.requestAnimationFrame = (() => fakeId()) as any;
  if (typeof g.cancelAnimationFrame === 'function')
    g.cancelAnimationFrame = (() => {}) as any;

  if (typeof g.requestIdleCallback === 'function')
    g.requestIdleCallback = (() => fakeId()) as any;
  if (typeof g.cancelIdleCallback === 'function')
    g.cancelIdleCallback = (() => {}) as any;

  // --- fetch ---
  // Return a harmless 204 Response; respect AbortSignal by rejecting with AbortError.
  if (typeof g.fetch === 'function') {
    g.fetch = (input: any, init?: any) => {
      const signal =
        init?.signal ??
        (typeof input === 'object' && input?.signal ? input.signal : undefined);

      if (signal?.aborted) {
        // Best-effort AbortError
        const AbortErr = g.DOMException ?? Error;
        return Promise.reject(new AbortErr('Aborted', 'AbortError'));
      }

      const body = '';
      const status = 204;
      const resp =
        typeof g.Response === 'function'
          ? new g.Response(body, { status, statusText: 'No Content' })
          : // Minimal shim if Response is missing (older Node environments)
            ({
              ok: true,
              status,
              statusText: 'No Content',
              headers: new Map(),
              url: '',
              clone() {
                return this;
              },
              async text() {
                return body;
              },
              async json() {
                return undefined;
              },
              async arrayBuffer() {
                return new ArrayBuffer(0);
              },
              async blob() {
                return new Blob([]);
              },
            } as unknown as Response);

      return Promise.resolve(resp);
    };
  }

  // --- WebSocket (closed inert stub) ---
  if (typeof originals.WebSocket === 'function') {
    // Create a guaranteed EventTarget-ish base
    const BaseEventTarget: {
      new (): EventTargetLike;
    } =
      typeof g.EventTarget === 'function'
        ? g.EventTarget
        : (class {
            addEventListener(_type: string, _listener: any, _opts?: any) {}
            removeEventListener(_type: string, _listener: any, _opts?: any) {}
            dispatchEvent(_evt: any) {
              return true;
            }
          } as any);

    type EventTargetLike = {
      addEventListener(type: string, listener: any, opts?: any): void;
      removeEventListener(type: string, listener: any, opts?: any): void;
      dispatchEvent(evt: any): boolean;
    };

    class WSStub extends BaseEventTarget {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;

      readonly CONNECTING = WSStub.CONNECTING;
      readonly OPEN = WSStub.OPEN;
      readonly CLOSING = WSStub.CLOSING;
      readonly CLOSED = WSStub.CLOSED;

      url: string;
      readyState = WSStub.CLOSED;
      protocol = '';
      binaryType: BinaryType = 'blob';

      onopen: ((ev: Event) => any) | null = null;
      onmessage: ((ev: MessageEvent) => any) | null = null;
      onerror: ((ev: Event) => any) | null = null;
      onclose: ((ev: CloseEvent) => any) | null = null;

      constructor(url: string) {
        super();
        this.url = url;
      }

      send(_data?: any) {}
      close(_code?: number, _reason?: string) {}

      // If BaseEventTarget is the fallback, these are already defined;
      // overriding here is harmless and keeps types happy.
      addEventListener(type: string, listener: any, opts?: any) {
        super.addEventListener(type, listener, opts);
      }
      removeEventListener(type: string, listener: any, opts?: any) {
        super.removeEventListener(type, listener, opts);
      }
      dispatchEvent(evt: any) {
        return super.dispatchEvent(evt);
      }

      get bufferedAmount() {
        return 0;
      }
      get extensions() {
        return '';
      }
      [Symbol.toStringTag] = 'WebSocket';
    }

    g.WebSocket = WSStub;
  }

  // --- navigator.sendBeacon ---
  if (g.navigator && typeof originals.sendBeacon === 'function') {
    g.navigator.sendBeacon = () => true;
  }

  // --- restore ---
  return function restore() {
    // Only restore what existed; avoid assigning undefined over real APIs.
    if (typeof originals.setTimeout === 'function')
      g.setTimeout = originals.setTimeout;
    if (typeof originals.clearTimeout === 'function')
      g.clearTimeout = originals.clearTimeout;
    if (typeof originals.setInterval === 'function')
      g.setInterval = originals.setInterval;
    if (typeof originals.clearInterval === 'function')
      g.clearInterval = originals.clearInterval;
    if (typeof originals.requestAnimationFrame === 'function')
      g.requestAnimationFrame = originals.requestAnimationFrame;
    if (typeof originals.cancelAnimationFrame === 'function')
      g.cancelAnimationFrame = originals.cancelAnimationFrame;
    if (typeof originals.requestIdleCallback === 'function')
      g.requestIdleCallback = originals.requestIdleCallback;
    if (typeof originals.cancelIdleCallback === 'function')
      g.cancelIdleCallback = originals.cancelIdleCallback;
    if (typeof originals.fetch === 'function') g.fetch = originals.fetch;
    if (typeof originals.WebSocket === 'function')
      g.WebSocket = originals.WebSocket;
    if (g.navigator && typeof originals.sendBeacon === 'function')
      g.navigator.sendBeacon = originals.sendBeacon;

    delete g.__dryAsyncPatched;
  };
}

export type RootOpts = {
  mode?: 'hidden' | 'measurable';
  parent?: HTMLElement;
  id?: string;
};

/**
 * Create a DOM container for a dry run.
 * @param {Object} [opts]
 * @param {'hidden'|'measurable'} [opts.mode='hidden']
 * @param {HTMLElement} [opts.parent=document.body]
 * @param {string} [opts.id='dry-root']
 */
export function createHiddenDomRoot(opts: RootOpts = {}) {
  if (typeof document === 'undefined') {
    throw new Error('createHiddenDomRoot must run in the browser');
  }

  const { mode = 'hidden', parent = document.body, id = 'dry-root' } = opts;

  const el = document.createElement('div');
  el.id = id;
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('role', 'presentation');
  el.setAttribute('data-dry-root', '');
  el.tabIndex = -1;

  try {
    el.inert = true;
  } catch {
    /* empty */
  }

  if (mode === 'hidden') {
    el.hidden = true;
    el.style.contain = 'layout paint style';
    el.style.contentVisibility = 'hidden';
  } else {
    const s = el.style;
    s.position = 'fixed';
    s.width = '0';
    s.height = '0';
    s.overflow = 'hidden';
    s.opacity = '0';
    s.visibility = 'hidden';
    s.pointerEvents = 'none';
    s.userSelect = 'none';
    s.contain = 'layout paint style';
    s.isolation = 'isolate';
  }

  parent.appendChild(el);
  return {
    container: el,
    destroy() {
      try {
        document.body.removeChild(el);
      } catch {
        /* empty */
      }
    },
  };
}