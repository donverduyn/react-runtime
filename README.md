# react-runtime

**react-runtime** introduces a new component model for [React](https://github.com/facebook/react) — where components act as computational units in a runtime graph. Using static type metadata, it traverses the dependency tree to collect runtime registrations and rebuilds exactly what’s needed at the leaf. 

**Portable, Reactive, Dependency-Injected Components.**

![Snap](https://github.com/user-attachments/assets/9f2edeb2-ebed-4fe0-af21-fb74eb388e79)

Powered by [Effect](https://github.com/Effect-TS/effect) and self-deduplicating HOCs, it enables portable, reactive components that inject services, push data upstream, and execute effects across runtime boundaries — without mocks, boilerplate, or manual wiring. All scopes are closed automatically on unmount, ensuring upstream callbacks and subscriptions are safely cleaned up.

## Features

✨ Here’s what you get out of the box:

- **Dependency Injection Made Simple**: Inject runtimes automatically using proxy-based or lazy instantiation — with full support for dynamic config via props.

- **Cross-Runtime Communication**: Pass data, callbacks, or event handlers into upstream runtimes using backpressured functions — enabling reactive streams, remote effect execution, and automatic cleanup on unmount.

- **Add Behavior with One Line**: Use withRuntime and withUpstream to declaratively attach data, side effects, or services to any component.

- **No More Setup Boilerplate**: Components get everything they need — even in tests or Storybook — without decorators or mocks.

- **No Wrapper Hell**: Self-deduplicating HOCs merge all runtime logic into a single wrapper — without interfering with any other HOCs.

- **Keep Logic Out of the UI**: Colocate your domain logic in reusable runtime modules and keep your components focused purely on rendering.

- **Type-Driven Transparency**: TypeScript infers the entire runtime dependency graph and shows exactly what each component expects and receives — no more guessing, no digging through files.


## Installation

```bash
npm install @donverduyn/react-runtime
```

## Usage

In the examples we use `mobx` for write only reactive stores, but you can use any other store or state management library. We also assume you are using `effect`, `react` and `react-dom` in your project.

### Defining a Runtime

Create a `App.runtime.ts` file to define a runtime context and a registry of components. `context` and `references` are expected to be exported from every runtime file.

```tsx
// src/App.runtime.ts
import { createRuntimeContext, withRuntime } from 'react-runtime';
import { pipe, Layer } from 'effect';
import { App } from './App';
import * as Tags from './App.tags';
import { createStore } from './store';

export const references = () => ({ App })

export const context = pipe(
    Layer.effect(Tags.Store, Effect.sync(createStore)),
    createRuntimeContext
)

// src/store.ts
import { observable } from 'mobx';
export const createStore = () => {
    const store = observable.map<string, any>();
    return { add: store.set }
}

```

### `using withRuntime`

Use `withRuntime` to define a component that requires a runtime context. This HOC will automatically inject the runtime context into the component:

```tsx
// src/App.tsx
import { withRuntime } from 'react-runtime';
import { AppRuntime } from './App.runtime'; 
import { AppComponent } from './App';
import { pipe } from 'effect';

export const App = pipe(
    AppView,
    withRuntime(AppRuntime)
)

const AppView = (props) => {
    return <h1>Hello world!</h1>;
}
```

### Using `withUpstream`

Use `withUpstream` to define dependencies for downstream components, for portable components in storybook and integration tests:

```tsx
// src/components/Child.tsx
import { withUpstream } from 'react-runtime';
import * as ChildRuntime from './Child.runtime';
import * as AppRuntime from './../App.runtime';
import * as AppTags from './../App.tags';

export const Child = pipe(
    ChildView,
    withUpstream(AppRuntime, ({ runtime }) => {
        const store = runtime.use(AppTags.Store);
        return { store }
    }),
)

const ChildView = ({ store }) => {
    return <div>{store.size}</div>;
}
```

### Dependency Injection

The HOCs automatically resolve and inject dependencies using proxy based and lazy instantiation, ensuring that all required runtimes are initialized in the correct order.

## Example


```tsx
// src/components/Child.tsx
import React from 'react';
import * as AppRuntime from '../App.runtime';
import * as AppTags from '../App.tags';

export const Child = pipe(
    ChildView,
    withUpstream(AppRuntime, ({ runtime }) => {
        const store = runtime.use(AppTags.Store);
        return { store }
    }),
)

type Props = {
    store: Map<string, any>;
};

const ChildView: React.FC<Props> = ({ store }) => {
    return (
        <div>Items: {store.size}</div>
    );
};
```

## How It Works

1. **Runtime Definition:** Each `.runtime.ts` file exports a runtime context and a reference to the component in which it is used by `withRuntime`. We currently assume, a runtime is only used in one component, because it shadows itself in the dependency tree. We might change this in the future.

2. **Upstream Dependencies:** Components define their dependencies using `withUpstream(SomeRuntime)`. During testing or storybook, they will inject the upstream runtime context directly into the component.

3. **Dependency Resolution:** The HOCs traverse bottom to top, and instantiate top to bottom, and then the order in which hocs are specificed, to resolve the dependency tree and lazily instantiate runtimes as needed.

4. **Component Composition:** The HOC composition flattens nested wrappers and returns a component with a single context provider tree. The last HOC in the chain always renders the component, while previous HOCs their wrappers are discarded, relyiing on assigned static properties for the dependency resolution process and a component side channel, which is passed into the first `withRuntime` or `withUpstream` hoc.


## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## Acknowledgments

- [effect](https://github.com/effect-TS) for providing the foundation for functional programming in TypeScript.
- The React community for inspiring modular and reusable component design.
