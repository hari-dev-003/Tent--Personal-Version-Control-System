# tent — Minimal VCS (Version Control) Toy

A small, educational version-control system implemented in Node.js. "tent" demonstrates the basic concepts behind Git: object storage, SHA-1 object ids, a staging area (index), commits, and a very small CLI (init, add, commit, log, diff).

This repository contains a single executable script, `tent.mjs`, which stores repository data under a `.tent` directory in the working directory.

## Table of contents

- About
- Features
- Getting started
  - Requirements
  - Install / Run
- Usage
  - Commands
  - Examples
- Internal design
- Development
- Contributing
- License

## About

This project is a minimal, teaching-focused implementation of a version control system similar to Git. It is not intended for production use. The goal is to show how a few core ideas (content-addressable storage, staging area, commits with parents) can be implemented in a few hundred lines of JavaScript.

## Features

- Initialize a repository (creates `.tent` folder).
- Add files into a content-addressable `objects/` folder using SHA-1 hashes.
- Simple staging area stored in `index`.
- Create commits (store commit objects, update `HEAD`).
- View commit history (`log`).
- Show diff between a commit and its parent for files tracked in that commit.

## Requirements

- Node.js 18+ (this project was developed with Node.js v22.x but will work with modern Node versions)
- npm (for installing dependencies)

## Install / Run

Clone this repo or copy the project files to a folder. Install dependencies and run the `tent.mjs` CLI with Node.

Install dependencies:

```powershell
cd E:\path\to\repo
npm install
```

Run the CLI directly with Node (the script is an ES module and uses a Unix-style shebang; on Windows use `node`):

```powershell
node tent.mjs <command>
# or run it directly if you have execution configured
./tent.mjs <command>
```

## Usage

Available commands (see `tent.mjs`):

- `init` — Initialize a new `.tent` repository in the current directory.
- `add <filePath>` — Add a file to the staging area. Stores the file content under `.tent/objects/<sha1>`.
- `commit <message>` — Create a commit object from the current staging area and update `HEAD`.
- `log` — Walk the commit chain from `HEAD` and print commit metadata and tracked files.
- `diff <commitHash>` — Show diffs for files in the specified commit compared to its parent commit.

Examples

```powershell
# Initialize the repository
node tent.mjs init

# Add a file
node tent.mjs add test.txt

# Commit staged files
node tent.mjs commit "Initial commit"

# View history
node tent.mjs log

# Show diff for a particular commit
node tent.mjs diff <commitHash>
```

Tip: `commitHash` is the SHA-1 printed when committing. You can copy it from the `Committed Successfully:` output.

## Internal design

High level:

- `.tent/objects/` — stores file blobs and commit objects, keyed by SHA-1.
- `.tent/HEAD` — stores the current commit hash.
- `.tent/index` — JSON array of objects describing the staging area: [{ path, hash }, ...].

Core implementation notes (found in `tent.mjs`):

- Hashing is performed with Node's built-in `crypto` module using the `sha1` algorithm.
- `add` reads a file, hashes its contents, writes the content to `.tent/objects/<hash>`, and appends an entry to `index`.
- `commit` reads the staging area (`index`), creates a commit object with: message, parent (current HEAD), timestamp, and files array, hashes it to form the commit id, writes the commit to `objects/`, updates `HEAD`, and clears the `index`.
- `log` walks commits by following the `parent` field.
- `diff` reads the commit object and, for each file present in the commit, compares the file's blob to the blob in the parent commit (when present) and prints a colored diff using `diff` and `chalk`.

Limitations and safety

- No file deletion handling: removing files from the working directory doesn't remove entries from the index/commits.
- No branching or merges.
- No packfiles or compression — this is a toy implementation.
- No security or access controls — don't use to store secrets.

## Development

Scripts in `package.json` are minimal; you can run the Node script directly for testing and development. When making changes, keep the following in mind:

- `type` is set to `commonjs` in `package.json`, however `tent.mjs` is an ES module (uses `import`/`export`). Node will still run ES modules when invoked with `node tent.mjs` if the file extension is `.mjs`. Be consistent when adding new files.
- Dependencies used: `commander` for CLI handling, `diff` for computing differences, and `chalk` for colored terminal output.

Run the CLI while developing:

```powershell
node tent.mjs <command>
```

Testing

There are no automated tests in this repository. To manually test basic functionality:

1. `node tent.mjs init`
2. `node tent.mjs add test.txt`
3. `node tent.mjs commit "My message"` (copy the commit hash)
4. `node tent.mjs log`
5. `node tent.mjs diff <commitHash>`

## Contributing

Small, focused pull requests that improve clarity, fix bugs, or add tests are welcome. This project is primarily educational — before adding major features, open an issue to discuss the design.

Suggested improvements:

- Add tests (e.g., using a temporary directory for repo creation).
- Add CLI help and validation for bad input.
- Improve storage format (add object headers or compression).
- Add commands for checkout/restore, removal, and simple branching.

## License

This repository uses the ISC license (see `package.json`).

---

If you'd like, I can also:

- Add basic unit tests and a recommended test workflow.
- Add a short CONTRIBUTING.md and a simple issue/pr template.
- Update `package.json` scripts with convenience commands for development.
