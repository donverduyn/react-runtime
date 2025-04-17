# react-runtime

`react-runtime` is a library designed to integrate [effect-ts](https://github.com/Effect-TS/core) with React, enabling seamless dependency injection and runtime management through hybrid higher-order components (HOCs). It provides a powerful API for creating portable React components that manage their dependencies dynamically and efficiently.

<img width="936" alt="Screenshot 2025-04-17 at 22 16 28" src="https://github.com/user-attachments/assets/8bd9704d-0626-4966-84f9-e73550352816" />


**NOTE: This project is currently WIP**

## Features

- **Hybrid Higher-Order Components (HOCs):** Use HOCs to define and manage runtime dependencies with static properties that reflect the dependency trees statically and at runtime.
- **Dependency Injection (DI):** Automatically resolve and inject dependencies using proxy-based or lazy instantiation with props for dynamic configurations.
- **Portable Components:** Create components that instantiate all dependent runtimes and configuration functions upstream in integration tests and storybook.
- **Cross-runtime Communication:** Facilitate RPC style communication between different runtimes and components using backpressured functions, to manage push/pull semantics.
- **Type level Dependency Graph Resolution:** Leverage TypeScript for type-safe dependency management and runtime context resolution.
- **Clean separation of concerns:** Keep your UI layer separated from the business logic, for better maintainability and testability.

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
    withUpstream(AppRuntime),
)

const ChildView = (props) => {
    return <div>Child Component</div>;
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

1. **Runtime Definition:** Each `.runtime.ts` file exports a runtime context and a registry of components using `withRuntime`.
2. **Upstream Dependencies:** Components define their dependencies using `withUpstream(SomeRuntime)`.
3. **Dependency Resolution:** The HOCs use topological sorting to resolve the dependency tree and lazily instantiate runtimes as needed.
4. **Component Composition:** The HOC composition flattens nested wrappers and returns a component with a single context provider tree. The last HOC in the chain always renders the component, while previous HOCs their wrappers are discarded, to rely on assigned static properties for the dependency resolution process.


## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## Acknowledgments

- [effect](https://github.com/effect-TS) for providing the foundation for functional programming in TypeScript.
- The React community for inspiring modular and reusable component design.
