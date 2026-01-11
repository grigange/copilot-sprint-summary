# Contributing to Sprint Summary for Copilot

Thank you for your interest in contributing! 🎉

## How to Contribute

### Reporting Bugs
1. Check if the bug has already been reported in [Issues](https://github.com/grigange/copilot-sprint-summary/issues)
2. If not, create a new issue using the Bug Report template
3. Provide as much detail as possible

### Suggesting Features
1. Check existing [Issues](https://github.com/grigange/copilot-sprint-summary/issues) for similar suggestions
2. Create a new issue using the Feature Request template
3. Explain the use case and benefits

### Pull Requests

#### Setup Development Environment
```bash
# Clone the repository
git clone https://github.com/grigange/copilot-sprint-summary.git
cd copilot-sprint-summary

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run in development mode (F5 in VS Code)
```

#### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly in Extension Development Host
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

#### Commit Message Format
We use [Conventional Commits](https://www.conventionalcommits.org/) for automated changelog generation and versioning:

```
<type>: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat:` New features (triggers minor version bump)
- `fix:` Bug fixes (triggers patch version bump)
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Maintenance tasks
- `ci:` CI/CD changes
- `BREAKING CHANGE:` in footer triggers major version bump

**Examples:**
```bash
feat: add multi-repository support
fix: resolve date format parsing issue
docs: update README with new configuration options
```

#### Code Style
- Use TypeScript strict mode
- Follow existing code patterns
- Add comments for complex logic
- Keep functions focused and small
- Update documentation when needed

#### Testing Checklist
- [ ] Extension compiles without errors
- [ ] All commands work as expected
- [ ] Settings update correctly
- [ ] No console errors or warnings
- [ ] Works with different Copilot models
- [ ] Tested on Windows/Mac/Linux (if possible)

## Questions?
Feel free to open a [Discussion](https://github.com/grigange/copilot-sprint-summary/discussions) or reach out!

## Code of Conduct
Be respectful, inclusive, and constructive. We're all here to build something useful together! 🚀