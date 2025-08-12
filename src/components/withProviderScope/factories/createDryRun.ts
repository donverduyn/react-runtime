/* eslint-disable eslint-comments/disable-enable-pair */

import * as React from 'react';
import ReactDOM from 'react-dom/client';
import { useResolveAfterRender } from 'hooks/common/useResolveAfterRender';
import type { ComponentId, DeclarationId, ProviderEntry } from 'types';
import {
  createHiddenDomRoot,
  disableAsyncGlobals,
  type RootOpts,
} from 'utils/dom';
import { computeEdgeReliability, type EdgeData } from 'utils/hash';

//
export function createReactDryRunRoot(opts: RootOpts) {
  const { container, destroy } = createHiddenDomRoot(opts);
  const root = ReactDOM.createRoot(container);
  return {
    render: root.render.bind(root),
    unmount() {
      try {
        root.unmount();
      } finally {
        destroy();
      }
    },
  };
}

const createDryRunController = <P extends object>(
  Component: React.FC<P>,
  props: P,
  resolve: () => void,
  timeoutMs: number = 50
) => {
  return function Controller() {
    useResolveAfterRender(resolve, timeoutMs);
    return React.createElement(Component, props);
  };
};

export async function createDryRun<P extends object>(
  Component: React.FC<P>,
  props: P,
  edge: EdgeData
) {
  const root = createReactDryRunRoot({ mode: 'hidden' });
  const reliability = computeEdgeReliability(edge);
  const restoreAsync = disableAsyncGlobals();

  function finish() {
    try {
      restoreAsync();
      root.unmount();
    } catch {
      /* empty */
    }
    return createDryRunResult({
      providers: new Map(),
      candidates: [
        {
          declarationId: edge.declId as DeclarationId,
          componentId: (edge.instId ?? '') as ComponentId,
          path: new Map(),
        },
      ],
    });
  }

  return new Promise((resolve) => {
    const Controller = createDryRunController(Component, props, () =>
      resolve(finish())
    );
    root.render(React.createElement(Controller));
  });
}

const createDryRunResult = (options: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providers: Map<DeclarationId, ProviderEntry<any, any>>;
  candidates: DryRunCandidate[];
}): DryRunResult => ({
  providers: options.providers,
  candidates: options.candidates,
});

type DryRunResult = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providers: Map<DeclarationId, ProviderEntry<any, any>>;
  candidates: DryRunCandidate[];
};

type DryRunCandidate = {
  declarationId: DeclarationId;
  componentId: ComponentId;
  path: Map<DeclarationId, DeclarationId>;
};
