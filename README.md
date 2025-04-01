# @lume-io/local-linker

A magical tool for managing local package dependencies in Node.js projects. Built with TypeScript for reliability and maintainability.

## The Problem

Working with local package dependencies in Node.js projects can be frustrating. Existing solutions like monorepos, Docker, or tools like `yalc` often require complex setup or multiple manual steps.

## The Solution

Local Linker provides a simple, magical experience for managing local dependencies:

1. Create a `.localpackages` file in your project
2. Run `local-linker`
3. That's it! Your local packages are linked and ready to use

## Installation

```bash
# Install globally
npm install -g @lume-io/local-linker

# Or use with npx
npx @lume-io/local-linker
```

## Usage

### 1. Create a `.localpackages` file

Create a `.localpackages` file in your project root with the following format:

```
# Basic format
ui-library = ../path/to/ui-library

# With custom build command
api-client = /absolute/path/to/api-client [npm run build:dev]

# With custom watch patterns
utils = ../common/utils [watch:src/**/*.ts,test/**/*.ts]

# With both custom build and watch patterns
components = ../components [pnpm run compile] [watch:src/**/*.{ts,tsx}]
```

### 2. Run the tool

```bash
# Link all packages
local-linker

# Link and watch for changes
local-linker --watch

# Resolve dependencies and build packages in the correct order
local-linker --deps

# Watch with dependency resolution
local-linker --watch --deps

# Disable spinners for CI environments
local-linker --no-spinner
```

## Features

- **Zero Configuration**: Just create the `.localpackages` file and run the tool
- **Auto Package Manager Detection**: Works with npm, yarn, or pnpm
- **Watch Mode**: Automatically rebuilds and relinks when source files change
- **Build Support**: Runs the package's build script before linking if available
- **Simple CLI**: Just run `local-linker` to link everything (after installing `@lume-io/local-linker`)
- **Custom Build Commands**: Specify custom build commands per package
- **Custom Watch Patterns**: Define exactly which files to watch per package
- **Dependency Resolution**: Build packages in the correct order based on their dependencies
- **Progress Spinners**: Visual feedback during long operations
- **TypeScript Support**: Built with TypeScript for better maintainability

## How It Works

Local Linker:

1. Reads your `.localpackages` file to find local dependencies
2. Detects your package manager (npm, yarn, or pnpm)
3. Builds each local package (if it has a build script)
4. Links the packages to your project using your package manager's link feature
5. In watch mode, it monitors the packages for changes and automatically rebuilds/relinks

## Benefits Over Existing Solutions

- No complex configuration files
- No need to manually run linking commands in multiple directories
- No need to understand the intricacies of each package manager's linking system
- Works seamlessly with existing projects without changing their structure
- The watch mode eliminates the need to manually rebuild and relink after changes
- Custom build commands allow for different build processes per package
- Dependency resolution ensures packages are built in the correct order
- Progress spinners provide clear visual feedback on what's happening

## About lume-io

`@lume-io/local-linker` is part of the lume-io organization, focused on creating developer tools that simplify workflows and enhance productivity. Our goal is to build tools that feel magical - they just work without complex configuration or steep learning curves.

## Advanced Configuration

You can configure additional options in your project's `package.json`:

```json
{
  "localLinker": {
    "useSpinner": true,
    "resolveDependencies": true
  }
}
```

### Available Options

- **useSpinner**: Enable or disable progress spinners (default: true)
- **resolveDependencies**: Automatically resolve and order packages by their dependencies (default: false)

## Contributing

This project is written in TypeScript. To contribute:

1. Fork the repository
2. Install dependencies: `npm install`
3. Make your changes in the `src` directory
4. Build the project: `npm run build`
5. Test your changes
6. Submit a pull request

## License

MIT
