import * as React from 'react';
import { render } from '@testing-library/react';
import { RenderContainer } from './RenderContainer';

type TextProps = { readonly text: string };
const Text: React.FC<TextProps> = ({ text }) => <div>{text}</div>;

describe('RenderContainer', () => {
  it('renders the target component with the correct props', () => {
    const map = new Map<keyof React.ComponentProps<typeof Text>, unknown>();
    map.set('text', 'Initial');

    const { getByText } = render(
      <RenderContainer renderFn={() => <Text text='Initial' />} />
    );
    expect(getByText('Initial')).toBeTruthy();
  });

  it('mutates props from previous sibling event of container', () => {
    type SiblingProps = { onChange: () => void };
    const Sibling: React.FC<SiblingProps> = ({ onChange }) => {
      const hasRun = React.useRef(false);
      if (!hasRun.current) {
        hasRun.current = true;
        onChange();
      }
      return null;
    };

    const Wrapper = () => {
      const props = React.useMemo(() => {
        const map = new Map<keyof React.ComponentProps<typeof Text>, unknown>();
        map.set('text', 'Initial');
        return map;
      }, []);

      return (
        <>
          <Sibling onChange={() => props.set('text', 'Before')} />
          <RenderContainer renderFn={() => <Text text='Before' />} />
          <Sibling onChange={() => props.set('text', 'After')} />
        </>
      );
    };

    const { getByText } = render(<Wrapper />);
    expect(getByText('Before')).toBeTruthy();
  });
});
