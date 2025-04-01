# @lume-io/local-linker

A magical tool for managing local package dependencies in Node.js projects.

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
# Format: package-name = path/to/package
ui-library = ../path/to/ui-library
api-client = /absolute/path/to/api-client
utils = ../common/utils
```

### 2. Run the tool

```bash
# Link all packages
local-linker

# Link and watch for changes
local-linker --watch
```

## Features

- **Zero Configuration**: Just create the `.localpackages` file and run the tool
- **Auto Package Manager Detection**: Works with npm, yarn, or pnpm
- **Watch Mode**: Automatically rebuilds and relinks when source files change
- **Build Support**: Runs the package's build script before linking if available
- **Simple CLI**: Just run `local-linker` to link everything (after installing `@lume-io/local-linker`)

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

## About lume-io

`@lume-io/local-linker` is part of the lume-io organization, focused on creating developer tools that simplify workflows and enhance productivity. Our goal is to build tools that feel magical - they just work without complex configuration or steep learning curves.

## License

MIT
