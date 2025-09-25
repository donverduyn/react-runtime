# react-runtime (Monorepo)

This document provides all the necessary information to get started with the `react-runtime` monorepo, including installation, testing, and contribution guidelines.

-----

## 🚀 Getting Started

Follow these steps to set up your development environment.

### Installation & Setup

1.  **Clone the project:**
    ```bash
    git clone <repository-url>
    ```
2.  **Open in Dev Container:** Open the cloned project folder in a VS Code Dev Container.
3.  **Install Extensions:** Install the recommended VS Code extensions when prompted.

### Running the "Hello World" Example

To see the project in action, you can run the example application:

```bash
cd examples/hello-world
yarn dev
```

-----

## 🧪 Testing

This project uses a comprehensive testing suite. You can run tests at the root level or for a specific package.

  - **Run all tests (UI mode):** From the root directory, run `yarn test:ui`.
  - **Run all tests (CLI):** From the root directory, run `yarn test`.
  - **Run package-specific tests:** Navigate into a package directory (e.g., `cd packages/core`) and run `yarn test`.

### Package-Level Test Scripts

Within each package, you can run more specific tests:

  - `yarn test:unit`: Runs unit tests.
  - `yarn test:integration`: Runs integration tests.
  - `yarn test:e2e`: Runs end-to-end tests.

-----

## 🏷️ Versioning & Releases

This project adheres to **Semantic Versioning (SemVer)** and uses **Conventional Commits** to automate versioning and changelog generation.

### Versioning Scheme

All packages follow the `MAJOR.MINOR.PATCH` versioning scheme:

  - **MAJOR**: Incremented for breaking changes.
  - **MINOR**: Incremented for new, backward-compatible features.
  - **PATCH**: Incremented for backward-compatible bug fixes.

### Conventional Commits

Commit messages must follow this format to streamline the release process:

```
<type>(<scope>): <description>

[optional body]
[optional footer(s)]
```

  - **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, etc.
  - **Scope**: The package or area affected (e.g., `core`, `react`, `examples`).

**Examples:**

```bash
# A new feature
feat(core): add runtime context proxy

# A bug fix
fix(react): resolve HOC deduplication bug

# A documentation update
docs: update README with testing instructions
```

When your changes are ready, create a changeset by running `yarn changeset`. This tool will prompt you to specify the version bump and summarize your changes for the changelog.

-----

## 🤝 Contributing

Contributions are welcome\! Please feel free to open an issue or submit a pull request on GitHub.

-----

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](https://www.google.com/search?q=./LICENSE) file for details.

-----

## 🙏 Acknowledgments

A special thanks to the following projects and communities:

  - [effect-TS](https://github.com/effect-TS) for providing the foundation for functional programming in TypeScript.
  - The **React community** for inspiring modular and reusable component design.