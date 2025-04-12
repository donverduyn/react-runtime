import { withStatic } from './withStatic';

describe('withStatic', () => {
  it('should copy static properties to the component', () => {
    // Mock component
    const MockComponent = () => <div>Mock Component</div>;

    // Static properties to be copied
    const staticProperties = {
      staticMethod: () => 'static method',
      anotherStaticMethod: () => 'another static method',
    };

    // Wrap the component with the withStatic HOC
    const WrappedComponent = withStatic(staticProperties)(MockComponent);

    // Check if the static properties are copied correctly
    expect(WrappedComponent.staticMethod()).toBe('static method');
    expect(WrappedComponent.anotherStaticMethod()).toBe(
      'another static method'
    );
  });
});
