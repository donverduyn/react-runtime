import * as React from 'react';
import { render } from '@testing-library/react';
import { useComponentInstance } from 'hooks/useComponentInstance/useComponentInstance';
import { useProviderTree } from 'hooks/useProviderTree/useProviderTree';
import { useRuntimeProvider } from 'hooks/useRuntimeProvider/useRuntimeProvider';
import { useTreeMap } from 'hooks/useTreeMap/useTreeMap';
import type {
  DeclarationId,
  RegisterId,
  ResolvedProviderEntry,
  ScopeId,
} from 'types';
import { OffTreeNode } from './OffTreeNode';

type ComponentProps = {
  readonly text: string;
};

function Component(props: ComponentProps) {
  console.log(props, 'from Component');
  return props.text;
}

describe('OffTreeNode', () => {
  it('should render FiberNode and populate props, before rendering the child', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries: ResolvedProviderEntry<any, any, unknown>[] = [];
    const registerId = '123' as RegisterId;
    const declarationId = '456' as DeclarationId;
    const scopeId = 'test' as ScopeId;
    const Root: React.FC = () => {
      const mergedProps = React.useRef<ComponentProps>({
        text: 'Hello World!',
      });

      const discoverFn: React.ComponentProps<
        typeof OffTreeNode
      >['discoveryFn'] = React.useCallback(() => {
        return { offTreeMap: new Map(), succeeded: true };
      }, []);

      const treeMap = useTreeMap(scopeId, registerId);
      const componentInstanceApi = useComponentInstance(scopeId);
      const providerTree = useProviderTree(
        scopeId,
        treeMap,
        componentInstanceApi
      );
      const runtimeProviderApi = useRuntimeProvider(
        scopeId,
        registerId,
        treeMap,
        providerTree
      );

      return (
        <div>
          <OffTreeNode
            declarationId={declarationId}
            discoveryFn={discoverFn}
            localProviders={entries}
            nodeProps={{}}
            registerId={registerId}
            runtimeProviderApi={runtimeProviderApi}
            strategy='use-stub'
          />
          <Component {...mergedProps.current} />
        </div>
      );
    };

    const { getByText, debug } = render(<Root />);

    debug();
    // TODO: actually modify the text by using an upstream runtime to override the text, so OffTreeNode makes it available and we can test the behavior.
    expect(getByText('Hello World!')).toBeInTheDocument();
  });
});
