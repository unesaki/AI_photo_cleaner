# Contributing to AI Photo Cleaner

Thank you for your interest in contributing to AI Photo Cleaner! 🎉

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/AI_photo_cleaner.git`
3. Install dependencies: `npm install`
4. Start the development server: `npm start`

## 📝 Development Process

### Branch Naming
- `feature/feature-name` - New features
- `bugfix/bug-description` - Bug fixes  
- `hotfix/critical-fix` - Critical fixes
- `docs/documentation-update` - Documentation updates

### Commit Messages
Follow conventional commits format:
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `style: code formatting`
- `refactor: code restructuring`
- `test: add or update tests`

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for code formatting
- Add JSDoc comments for public APIs

### Before Submitting
1. Run tests: `npm test` (when available)
2. Check TypeScript: `npx tsc --noEmit`
3. Run linter: `npm run lint`
4. Test on both iOS and Android

## 🏗️ Project Structure

```
src/
├── components/     # Reusable UI components
├── services/       # Business logic and API services
├── types/         # TypeScript type definitions
├── utils/         # Utility functions and constants
└── hooks/         # Custom React hooks

app/
├── (tabs)/        # Tab-based navigation screens
└── _layout.tsx    # Root layout component
```

## 🧪 Testing

- Write unit tests for business logic
- Test on multiple devices and screen sizes
- Verify accessibility compliance
- Check performance with large photo libraries

## 📋 Pull Request Process

1. Create a feature branch from `develop`
2. Make your changes
3. Add tests if applicable
4. Update documentation
5. Submit a pull request to `develop`
6. Address review feedback

## 🐛 Reporting Bugs

Use the bug report template and include:
- Clear reproduction steps
- Device and OS information
- Screenshots or videos
- Error messages or logs

## 💡 Feature Requests

Use the feature request template and provide:
- Clear problem description
- Proposed solution
- Use cases and examples
- Alternative solutions considered

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 📞 Getting Help

- Check existing issues and discussions
- Create a new issue for bugs or questions
- Join our community discussions

Thank you for contributing! 🙏