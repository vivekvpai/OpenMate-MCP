#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
import os from 'os';

// Configuration
const STORE_DIR = path.join(os.homedir(), ".openmate");
const STORE_FILE = path.join(STORE_DIR, "repos.json");

// Helper functions
function ensureStore() {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(
      STORE_FILE,
      JSON.stringify({ version: 2, repos: {}, collections: {} }, null, 2),
      { mode: 0o600 }
    );
  }
}

function loadStore() {
  ensureStore();
  try {
    const data = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    if (!data.repos) data.repos = {};
    if (!data.collections) data.collections = {};
    return data;
  } catch (e) {
    console.error("Error reading store. Recreating...");
    const defaultStore = { version: 2, repos: {}, collections: {} };
    fs.writeFileSync(STORE_FILE, JSON.stringify(defaultStore, null, 2), {
      mode: 0o600,
    });
    return defaultStore;
  }
}

function saveStore(store) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

function normalizeName(name) {
  if (!name || typeof name !== "string") return "";
  return name.trim().toLowerCase();
}

// Create server instance
const server = new McpServer({
  name: "openmate",
  version: "1.0.0",
});

// List repositories and collections
server.tool(
  "list-repos",
  "List all repositories and collections",
  {
    type: z.enum(["all", "repos", "collections"]).optional().default("all").describe("What to list: all, repos only, or collections only")
  },
  async ({ type = "all" }) => {
    try {
      const store = loadStore();
      let output = "";
      
      if (type === "all" || type === "repos") {
        const repoEntries = Object.entries(store.repos);
        if (repoEntries.length > 0) {
          output += "📁 Repositories:\n";
          repoEntries.forEach(([name, data], index) => {
            const repoPath = typeof data === 'string' ? data : data.path;
            output += `  ${index + 1}. ${name} -> ${repoPath}\n`;
          });
          output += "\n";
        } else {
          output += "📁 No repositories found\n\n";
        }
      }
      
      if (type === "all" || type === "collections") {
        const collectionEntries = Object.entries(store.collections);
        if (collectionEntries.length > 0) {
          output += "📚 Collections:\n";
          collectionEntries.forEach(([key, collection], index) => {
            const repos = collection.repos || (Array.isArray(collection) ? collection : []);
            output += `  ${index + 1}. ${collection.name || key} (${repos.length} repos)\n`;
          });
        } else {
          output += "📚 No collections found\n";
        }
      }
      
      if (!output) {
        output = "No repositories or collections found.";
      }
      
      return {
        content: [{ type: "text", text: output }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }]
      };
    }
  }
);

// Add a new repository
server.tool(
  "add-repo",
  "Add a new repository to OpenMate",
  {
    name: z.string().min(1).describe("The name to identify this repository"),
    path: z.string().min(1).describe("The filesystem path to the repository")
  },
  async ({ name, path: repoPath }) => {
    try {
      const store = loadStore();
      const normalized = normalizeName(name);
      
      if (store.repos[normalized]) {
        return {
          content: [{ type: "text", text: `❌ Repository '${name}' already exists` }]
        };
      }
      
      const expandedPath = repoPath.replace(/^~(?=$|[\\/])/, os.homedir());
      const resolvedPath = path.resolve(expandedPath);
      
      const stats = fs.statSync(resolvedPath);
      if (!stats.isDirectory()) {
        throw new Error('Path is not a directory');
      }
      
      store.repos[normalized] = {
        path: resolvedPath,
        addedAt: new Date().toISOString()
      };
      saveStore(store);
      
      return {
        content: [{ type: "text", text: `✅ Added repository '${name}' -> '${resolvedPath}'` }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }]
      };
    }
  }
);

// Get repository path
server.tool(
  "get-repo",
  "Get the path of a repository by name",
  {
    name: z.string().min(1).describe("The name of the repository to look up")
  },
  async ({ name }) => {
    try {
      const store = loadStore();
      const normalized = normalizeName(name);
      const repoData = store.repos[normalized];
      
      if (!repoData) {
        return {
          content: [{ type: "text", text: `❌ Repository '${name}' not found` }]
        };
      }
      
      const repoPath = typeof repoData === 'string' ? repoData : repoData.path;
      return {
        content: [{ type: "text", text: repoPath }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }]
      };
    }
  }
);

// Remove a repository
server.tool(
  "remove-repo",
  "Remove a repository from OpenMate",
  {
    name: z.string().min(1).describe("The name of the repository to remove")
  },
  async ({ name }) => {
    try {
      const store = loadStore();
      const normalized = normalizeName(name);
      
      if (!store.repos[normalized]) {
        return {
          content: [{ type: "text", text: `❌ Repository '${name}' not found` }]
        };
      }
      
      delete store.repos[normalized];
      saveStore(store);
      
      return {
        content: [{ type: "text", text: `✅ Removed repository '${name}'` }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }]
      };
    }
  }
);

// Add a collection
server.tool(
  "add-collection",
  "Create a collection of repositories",
  {
    name: z.string().min(1).describe("The name of the collection"),
    repos: z.string().min(1).describe("Comma-separated list of repository names")
  },
  async ({ name, repos }) => {
    try {
      const store = loadStore();
      const normalized = normalizeName(name);
      const repoList = repos.split(',').map(r => normalizeName(r.trim()));
      
      const missingRepos = repoList.filter(r => !store.repos[r]);
      if (missingRepos.length > 0) {
        return {
          content: [{ type: "text", text: `❌ Repositories not found: ${missingRepos.join(', ')}` }]
        };
      }
      
      store.collections[normalized] = {
        name: name,
        repos: repoList,
        createdAt: new Date().toISOString()
      };
      saveStore(store);
      
      return {
        content: [{ type: "text", text: `✅ Created collection '${name}' with ${repoList.length} repos` }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }]
      };
    }
  }
);

// Delete a collection
server.tool(
  "delete-collection",
  "Delete a collection from OpenMate",
  {
    name: z.string().min(1).describe("The name of the collection to delete")
  },
  async ({ name }) => {
    try {
      const store = loadStore();
      const normalized = normalizeName(name);
      
      if (!store.collections[normalized]) {
        return {
          content: [{ type: "text", text: `❌ Collection '${name}' not found` }]
        };
      }
      
      delete store.collections[normalized];
      saveStore(store);
      
      return {
        content: [{ type: "text", text: `✅ Deleted collection '${name}'` }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }]
      };
    }
  }
);

// List collection
server.tool(
  "list-collection",
  "List repositories in a collection",
  {
    name: z.string().optional().describe("Optional: The name of the collection to list")
  },
  async ({ name }) => {
    try {
      const store = loadStore();
      
      if (!name) {
        const collections = Object.keys(store.collections);
        if (collections.length === 0) {
          return {
            content: [{ type: "text", text: "No collections found" }]
          };
        }
        return {
          content: [{ type: "text", text: `Available collections: ${collections.join(', ')}` }]
        };
      }
      
      const normalized = normalizeName(name);
      const collection = store.collections[normalized];
      
      if (!collection) {
        return {
          content: [{ type: "text", text: `❌ Collection '${name}' not found` }]
        };
      }
      
      const repos = collection.repos || [];
      return {
        content: [{ type: "text", text: `Collection '${name}': ${repos.join(', ')}` }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }]
      };
    }
  }
);

// Initialize current directory
server.tool(
  "init-repo",
  "Add current directory as a repository",
  {
    name: z.string().min(1).describe("The name to assign to the current directory")
  },
  async ({ name }) => {
    try {
      const currentDir = process.cwd();
      const store = loadStore();
      const normalized = normalizeName(name);
      
      if (store.repos[normalized]) {
        return {
          content: [{ type: "text", text: `❌ Repository '${name}' already exists` }]
        };
      }
      
      store.repos[normalized] = {
        path: currentDir,
        addedAt: new Date().toISOString()
      };
      saveStore(store);
      
      return {
        content: [{ type: "text", text: `✅ Added current directory as '${name}'` }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }]
      };
    }
  }
);

// Main function
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenMate MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});