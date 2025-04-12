# Hello World Example

This example demonstrates the basic usage of `react-runtime` to create a simple React application with runtime dependency injection using `withRuntime`.

## Overview

The `hello-world` example showcases how to define a runtime context and use it to manage dependencies in a React component. It includes:

- Defining a runtime context with `createRuntimeContext`.
- Using `withRuntime` to inject the runtime context into a React component.
- Creating a simple store using `mobx` for state management.

## Setup

To run this example, ensure you have the following dependencies installed in your project:

```bash
npm install react-runtime effect
```

## File Structure

```
hello-world/
├── src/
│   ├── App.runtime.ts
│   ├── App.tsx
│   ├── store.ts
│   └── index.tsx
└── README.md
```

## Implementation

### Defining the Runtime

The runtime is defined in `App.runtime.ts`. It includes a store created with `mobx` and is exported as `context`.

```tsx
// src/App.runtime.ts
import { createRuntimeContext, withRuntime } from 'react-runtime';
import { pipe, Layer, Effect } from 'effect';
import * as Tags from './App.tags';
import { createStore } from './store';

export const references = () => ({});

export const context = pipe(
  Layer.scopedDiscard(Effect.gen(function* () {
    const store = yield* Tags.Store;
    yield* pipe(
      Stream.fromIterable([1, 2, 3]),
      Stream.tap((i) => store.set('message', `Hello, world! ${i}`)),
      Stream.runDrain(),
      Effect.forkScoped
    )
  })),
  Layer.provideMerge(
    Layer.effect(Tags.Store, Effect.sync(createStore))
  ),
  createRuntimeContext
);
```

### Creating the Store

The store is a simple `mobx` observable map.

```tsx
// src/store.ts
import { observable } from 'mobx';

export const createStore = () => {
  const store = observable.map<string, any>();
  store.set('message', 'Hello, world!');
  return store;
};
```

### Using `withRuntime`

The `App` component uses `withRuntime` to inject the runtime context and access the store.

```tsx
// src/App.tsx
import React from 'react';
import { withRuntime } from 'react-runtime';
import { pipe } from 'effect';
import * as Tags from './App.tags';
import { context } from './App.runtime';

export const App = pipe(
  AppView,
  withRuntime(context, ({ runtime }) => {
    const store = runtime.use(Tags.Store);
    return { message: store.get('message') };
  })
);

type Props = {
  message: string;
};

const AppView: React.FC<Props> = ({ message }) => {
  return <h1>{message}</h1>;
};
```

### Entry Point

The `index.tsx` file renders the `App` component.

```tsx
// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './App';

ReactDOM.render(<App />, document.getElementById('root'));
```

## Running the Example

1. Build and start the application:
   ```bash
   npm start
   ```
2. Open your browser and navigate to `http://localhost:3000`. You should see the message "Hello, world!".

## How It Works

1. **Runtime Definition:** The runtime context is defined in `App.runtime.ts` and includes the `mobx` store.
2. **Dependency Injection:** The `withRuntime` HOC injects the runtime context into the `App` component.
3. **Dynamic Resolution:** The `App` component retrieves the `message` from the store and displays it.

## License

This example is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.