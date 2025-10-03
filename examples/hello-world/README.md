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
│   └── index.tsx
└── README.md
```

## Implementation

### Defining the Runtime

The runtime is defined in `App.runtime.ts`. It includes an AppCounter service created , and exports the context as `AppRuntime`.

```tsx
// src/App.runtime.ts
import { getPropTag, createRuntimeContext } from '@donverduyn/react-runtime';
import type { Props } from './App';

const { PropService } = getPropTag<Props>();

export class AppCounter extends Effect.Service<AppCounter>()('App/AppCounter', {
  scoped: Effect.gen(function* () {
    const { id } = yield* PropService;
    const countRef = yield* SubscriptionRef.make(0);

    yield* pipe(
      Stream.fromSchedule(Schedule.fixed(1000)),
      Stream.tap(() => Ref.updateAndGet(countRef, (v) => v + 1)),
      Stream.runDrain,
      Effect.forkScoped
    );
    return pipe(
      Stream.zipLatest(id, countRef.changes),
      Stream.map(([id, value]) => `from ${id}: ${String(value)}`)
    );
  }),
}) {}

const layer = pipe(AppCounter.Default);
export const AppRuntime = createRuntimeContext({ name: 'AppRuntime' })(layer);
```

### Using `withRuntime`

The `App` component uses `withRuntime` to inject the runtime context and access the store.

```tsx
// src/App.tsx
import { withRuntime } from '@donverduyn/react-runtime';
import { AppRuntime } from './App.runtime';

type Props = {
  text: string;
};

export const App = pipe(
  AppView,
  withRuntime(AppRuntime, ({ runtime }) => {
    const count = runtime.use(AppCounter);
    return { text: count };
  })
);

const AppView: React.FC<Props> = ({ text }) => {
  return <h1>{text}</h1>;
};
```

## Running the Example

1. Build and start the application:
   ```bash
   yarn dev
   ```
2. Open your browser and navigate to `http://localhost:5173`. You should see the message "Hello, world!".

## How It Works

1. **Runtime Definition:** The runtime context is defined in `App.runtime.ts`.
2. **Dependency Injection:** The `withRuntime` HOC injects the runtime into the `App` component.
3. **Dynamic Resolution:** Descendents of the `App` component can access the runtime and its services.

## License

This example is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.