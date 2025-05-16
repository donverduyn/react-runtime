# react-runtime

[![npm version](https://img.shields.io/npm/v/@donverduyn/react-runtime.svg?label=%20npm)](https://www.npmjs.com/package/@donverduyn/react-runtime)
[![CI](https://img.shields.io/github/actions/workflow/status/donverduyn/react-runtime/ci.yml?label=CI)](https://github.com/donverduyn/react-runtime/actions)
[![License](https://img.shields.io/npm/l/@donverduyn/react-runtime)](LICENSE)
[![Types](https://img.shields.io/npm/types/@donverduyn/react-runtime.svg)](https://www.npmjs.com/package/@donverduyn/react-runtime)
[![Made with Effect](https://img.shields.io/badge/made%20with-Effect-7347ff)](https://github.com/Effect-TS/effect)


**react-runtime** introduces a new component model for [React](https://github.com/facebook/react) — where components act as computational units in a runtime graph. Using static type metadata, it traverses the dependency tree to collect runtime registrations and rebuilds exactly what’s needed at the leaf. 

**Portable, Reactive, Dependency-Injected Components.**

![Snap](https://github.com/user-attachments/assets/9f2edeb2-ebed-4fe0-af21-fb74eb388e79)

Powered by [Effect](https://github.com/Effect-TS/effect) and self-deduplicating HOCs, it enables portable, reactive components that inject services, push data upstream, and execute effects across runtime boundaries — without mocks, boilerplate, or manual wiring. All scopes are closed automatically on unmount, ensuring upstream callbacks and subscriptions are safely cleaned up.

## Features

Here’s what you get out of the box:

- 🧩 **Dependency Injection Made Simple**: Inject runtimes automatically using proxy-based or lazy instantiation — with full support for dynamic config via props.

- 🔁 **Cross-Runtime Communication**: Pass data, callbacks, or event handlers into upstream runtimes using backpressured functions — enabling reactive streams, remote effect execution, and automatic cleanup on unmount.

- ✨ **Add Behavior with One Line**: Use withRuntime and withUpstream to declaratively attach data, side effects, or services to any component.

- 🧬 **No More Setup Boilerplate**: Components get everything they need — even in tests or Storybook — without decorators or mocks.

- 🚫 **No Wrapper Hell**: Self-deduplicating HOCs merge all runtime logic into a single wrapper — without interfering with any other HOCs.

- 🧠 **Keep Logic Out of the UI**: Colocate your domain logic in reusable runtime modules and keep your components focused purely on rendering.

- 🔍 **Type-Driven Transparency**: TypeScript infers the entire runtime dependency graph and shows exactly what each component expects and receives — no more guessing, no digging through files.


## Installation

```bash
npm install @donverduyn/react-runtime
```

## Usage

We assume you are using `effect`, `react` and `react-dom` in your project. In the examples we use `mobx` , but this is optional. 

### Defining a Runtime

Create a `App.runtime.ts` file to define a runtime context and a registry of components. `context` and `reference` are expected to be exported from every runtime file.

```tsx
// src/App.runtime.ts
import { createRuntimeContext, withRuntime } from '@donverduyn/react-runtime';
import { pipe, Layer } from 'effect';
import { App } from './App';
import { createStore } from './store';

export class Store extends Effect.Service<Store>()('App/Store', {
  effect: Effect.sync(createStore),
}) {}

export const context = pipe(
  Store.Default,
  createRuntimeContext({})
);

export const reference = () => App;
```

### using `withRuntime`

Use `withRuntime` to define a component that requires a runtime context. This HOC will automatically inject the runtime context into the component:

```tsx
// src/App.tsx
import { withRuntime } from "@donverduyn/react-runtime";
import * as AppRuntime from "./App.runtime";
import { pipe } from "effect";
import { Child } from "./components/Child";

export const App = pipe(
  AppView,
  withRuntime(AppRuntime, ({ runtime }) => ({
    store: runtime.use(AppRuntime.Store),
  })),
);

const AppView = () => {
  return (
    <div>
      <h1>Hello World!</h1>
      <Child />
    </div>
  );
};

```

### Using `withUpstream`

Use `withUpstream` to define dependencies for downstream components.

```tsx
// src/components/Child.tsx
import { withUpstream, withRuntime } from "@donverduyn/react-runtime";
import * as ChildRuntime from "./Child.runtime";
import * as AppRuntime from "./../App.runtime";

export const Child = pipe(
  ChildView,
  withUpstream(AppRuntime, ({ runtime }) => ({
    store: runtime.use(AppRuntime.Store),
  })),
  withRuntime(ChildRuntime)
);

const ChildView = () => {
  return (
    <div>
      <h2>Hello child!</h2>
    </div>
  );
};
```

### Dependency Injection

Resolve and inject dependencies automatically, using proxy based and lazy instantiation, ensuring that all required runtimes are initialized in the correct order and available through props.

## Example


```tsx
// src/components/Child.tsx
import React from "react";
import { observer } from "mobx-react-lite";
import * as AppRuntime from "../App.runtime";

type Props = {
  store: Map<string, any>;
};

export const Child = pipe(
  ChildView,
  withUpstream(AppRuntime, ({ runtime }) => ({
    store: runtime.use(AppRuntime.Store),
  })),
);

const ChildView: React.FC<Props> = observer(({ store }) => {
  return <div>{store.get("message")}</div>;
});

```

## How It Works

1. **Runtime Definition:** Each `.runtime.ts` file exports a runtime context which is a named export called **context** and a reference to the component, which is a named export called **reference**, which are used by `withRuntime`. We currently assume, a runtime is only used in one component, because it shadows itself in the dependency tree. We might change this in the future.

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
