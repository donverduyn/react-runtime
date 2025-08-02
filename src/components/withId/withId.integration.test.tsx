import type React from 'react';
import { render } from '@testing-library/react';
import { withId } from 'components/withId/withId';
import { connect } from 'utils/runtime';

const ComponentView: React.FC<{ readonly id: string }> = ({ id }) => (
  <div>{id}</div>
);

describe('withId', () => {
  it('should render the wrapped component', () => {
    const Component = connect(
      ComponentView,
      withId((props) => props.id)
    );

    const id = 'test';
    const { getByText } = render(<Component id={id} />);
    expect(getByText(id)).toBeDefined();
  });
});
