# OpenMate MCP Server (`om`)

<img src="./assets/gif.gif" alt="OpenMate" width="600">

[![Visitors](https://visitor-badge.laobi.icu/badge?page_id=vivekvpai.OpenMate-MCP)](https://github.com/vivekvpai/OpenMate-MCP)
[![NPM Downloads](https://img.shields.io/npm/dt/openmate-mcp)](https://www.npmjs.com/package/openmate-mcp)
[![NPM Version](https://img.shields.io/npm/v/openmate-mcp)](https://www.npmjs.com/package/openmate-mcp)
[![GitHub Stars](https://img.shields.io/github/stars/vivekvpai/OpenMate-MCP?style=social)](https://github.com/vivekvpai/OpenMate-MCP)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/vivekvpai/OpenMate-MCP/blob/main/LICENSE)

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

- Open repositories in your favorite editor:
  - **VS Code** (`om vs <name>`)
  - **Windsurf** (`om ws <name>`)
  - **Cursor** (`om cs <name>`)
  - **IntelliJ IDEA** (`om ij <name>`)
  - **PyCharm** (`om pc <name>`)
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
- delete-collection: Delete a collection
- list-collection: List collection contents
- init-repo: Add current directory

---

# OpenMate UI

OpenMate UI is a desktop application that allows you to manage and open your local repositories in your favorite editor with quick shortcuts.

> **Note:** supports windows for now

### Download OpenMate UI from [here](https://github.com/vivekvpai/OpenMate/releases).

## ✅ Features

- Add and store repository paths by name
- Initialize current directory as a repository with `om init <name>`
- Open repositories in your favorite editor:
  - **VS Code** (`om vs <name>`)
  - **Windsurf** (`om ws <name>`)
  - **Cursor** (`om cs <name>`)
  - **IntelliJ IDEA** (`om ij <name>`)
  - **PyCharm** (`om pc <name>`)
- Smart suggestions when typing partial repository names:
  - Shows matching repositories and collections as you type partial name and hit enter
  - Displays repositories and collections in separate, clearly labeled lists
  - Works with all editor commands (vs, ws, cs, ij, pc)
- Update or remove stored repos
- Print the stored path of a repo
- List all stored repositories and collections
- **Collections**:
  - Group related repositories together and open them all at once
  - View detailed repository list for a specific collection (`om list <collection>`)
  - List all collections with `om list -c`
- Lightweight and super easy to use
- **UI**: OpenMate UI is a desktop application that allows you to manage and open your local repositories in your favorite editor with quick shortcuts. (supports windows for now)

---

## 📝 License

MIT License © 2025 Pai
