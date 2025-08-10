/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import ReactDOM from 'react-dom/client';

type Restore = () => void;

export function withPatchedGlobals<T>(fn: () => T): T {
  const g = globalThis;

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
    sendBeacon: g.navigator.sendBeacon,
  };

  // timers → no-op
  const fakeId = (() => {
    let n = 1;
    return () => n++;
  })();

  // @ts-expect-error __promisify__ missing
  g.setTimeout = (_: any) => fakeId();
  g.clearTimeout = () => {};
  // @ts-expect-error number is not assignable to Timeout
  g.setInterval = (_: any) => fakeId();
  g.clearInterval = () => {};
  g.requestAnimationFrame = (_: any) => fakeId();
  g.cancelAnimationFrame = () => {};
  g.requestIdleCallback = (_: any) => fakeId();
  g.cancelIdleCallback = () => {};

  // fetch → resolved empty Response
  // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
  g.fetch = async (_input: any, _init?: any) =>
    new Response('', { status: 204, statusText: 'No Content' });

  // WebSocket → inert stub
  // @ts-expect-error missing properties
  g.WebSocket = class {
    readyState = 3 as const; // CLOSED
    close() {}
    addEventListener() {}
    removeEventListener() {}
    send() {}
  };

  // sendBeacon → no-op success
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (g.navigator) g.navigator.sendBeacon = () => true;

  const restore: Restore = () => {
    Object.assign(g, originals);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (g.navigator && originals.sendBeacon)
      g.navigator.sendBeacon = originals.sendBeacon;
  };

  try {
    return fn();
  } finally {
    restore();
  }
}

export type DeclId = string;
export type InstId = string;

export function createDrySession(target: InstId) {
  return {
    target,
    hit: false,
    path: [] as DeclId[] | null,
    stack: [] as DeclId[],
    childToParent: new Map<DeclId, DeclId | null>(),
    idToDeclarationId: new Map<InstId, DeclId>(),
  };
}

const DryCtx = React.createContext<ReturnType<typeof createDrySession> | null>(
  null
);

export const DryProvider: React.FC<{
  readonly session: ReturnType<typeof createDrySession>;
  readonly children: React.ReactNode;
}> = ({ session, children }) => (
  <DryCtx.Provider value={session}>{children}</DryCtx.Provider>
);

export function useTraceNode(
  declarationId: string,
  componentId: string,
  parentInstanceId: string | null
) {
  const session = React.useContext(DryCtx);
  React.useEffect(() => {
    if (!session) return;
    return () => {
      session.stack.pop();
    };
  }, [session, declarationId]);

  if (!session) return;
  session.idToDeclarationId.set(componentId, declarationId);
  const parentDeclarationId = parentInstanceId
    ? (session.idToDeclarationId.get(parentInstanceId) ?? null)
    : null;

  if (!session.childToParent.has(declarationId)) {
    session.childToParent.set(declarationId, parentDeclarationId);
  }
  session.stack.push(declarationId);

  if (!session.hit && componentId === session.target) {
    session.hit = true;
    session.path = [...session.stack];
  }
}

// // inside your HOC wrapper render
// const parentInstId = React.useContext(ParentIdContext);
// useTraceNode(declarationId, props.id as string, parentInstId ?? null);

export async function dryRunFindPath<C extends React.FC<any>>(
  Root: C,
  rootProps: React.ComponentProps<C>,
  targetInstId: string,
  timeoutMs = 50
) {
  const mount = document.createElement('div');
  const hidden =
    'position:fixed;left:-99999px;top:-99999px;width:0;height:0;opacity:0;';
  mount.style.cssText = hidden;
  document.body.appendChild(mount);

  const session = createDrySession(targetInstId);
  const root = ReactDOM.createRoot(mount, { identifierPrefix: 'dry' });

  const finish = () => {
    const result = {
      path: session.path ?? [],
      parentOf: session.childToParent,
    };
    try {
      root.unmount();
    } finally {
      if (mount.parentNode) document.body.removeChild(mount);
    }
    return result;
  };

  return await withPatchedGlobals(
    async () =>
      await new Promise<{
        path: string[];
        parentOf: Map<string, string | null>;
      }>((resolve) => {
        function Controller() {
          React.useEffect(() => {
            const id = setTimeout(() => resolve(finish()), timeoutMs);
            return () => clearTimeout(id);
          }, []);
          React.useEffect(() => {
            if (session.hit) queueMicrotask(() => resolve(finish()));
          });
          return (
            <DryProvider session={session}>
              {React.createElement(Root, rootProps)}
            </DryProvider>
          );
        }
        root.render(React.createElement(Controller));
      })
  );
}
