# Contributing to RGS (Argis) - Reactive Global State

Thank you for your interest in contributing!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/dpassariello/rgs.git
cd rgs

# Install dependencies
npm install

# Run tests
npm test

# Run linter
npm run lint

# Build
npm run build
```

## Code Style

- Use TypeScript with strict mode
- Follow ESLint rules
- Add JSDoc comments for public APIs
- Write tests for new features

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Ensure tests pass: `npm test`
5. Ensure linting passes: `npm run lint`
6. Commit your changes
7. Push to your fork
8. Open a Pull Request

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create a release on GitHub
4. NPM publish happens automatically via CI/CD

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
