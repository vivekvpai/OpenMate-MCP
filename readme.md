# OpenMate MCP Server (`om`)

<img src="./assets/gif.gif" alt="OpenMate" width="600">

An MCP (Model Context Protocol) server for managing repositories and collections with OpenMate.

> Note: This MCP server work only when OpenMate CLI is installed.

## OpenMate CLI

```bash
npm install -g openmate
```

For more information, visit

- [OpenMate CLI (GitHub)](https://github.com/vivekvpai/OpenMate).
- [OpenMate CLI (npm)](https://www.npmjs.com/package/openmate).

### Features

- List all repositories and collections
- Add a new repository
- Get repository path
- Remove a repository
- Add a collection
- Delete a collection
- List collection contents
- Add current directory

## Installation

```bash
npm install -g openmate-mcp
```

Usage with Claude Desktop / Windsurf / Cursor
Add configuration:

```json
{
  "mcpServers": {
    "openmate": {
      "command": "openmate-mcp"
    }
  }
}
```

### Available Tools

- list-repos: List all repositories and collections
- add-repo: Add a new repository
- get-repo: Get repository path
- remove-repo: Remove a repository
- add-collection: Create a collection
  delete-collection: Delete a collection
  list-collection: List collection contents
  init-repo: Add current directory

## 📝 License

MIT License © 2025 Pai
