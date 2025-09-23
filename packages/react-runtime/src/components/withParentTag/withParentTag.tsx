// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable react/jsx-filename-extension */
const WithParentTag =
  () =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <C extends React.FC<any>>(Component: React.FC<any>) => {
    // const WrappedComponent = (props) => {
    //   // Here you can add logic to handle parent tag or any other functionality
    //   return <Component {...props} />;
    // };
    // // Copy static properties from the original component to the wrapped component
    // copyStaticProperties(Component, WrappedComponent);
    // // Return the wrapped component with static properties
    // return WrappedComponent;
  };
