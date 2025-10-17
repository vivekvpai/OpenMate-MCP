#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";

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

// IDE opening functions
function openVS(repoPath) {
  if (process.platform === "darwin") {
    spawn("open", ["-a", "Visual Studio Code", repoPath], {
      stdio: "ignore",
      detached: true,
    });
  } else {
    attemptLaunch(
      [
        { cmd: "code", args: [repoPath] },
        { cmd: "code-insiders", args: [repoPath] },
      ],
      {
        onFail: () => {
          console.error(
            "❌ Could not find VS Code CLI ('code'). Install it via VS Code settings."
          );
          process.exit(1);
        },
      }
    );
  }
}

function openWS(repoPath) {
  if (process.platform === "darwin") {
    spawn("open", ["-a", "Windsurf", repoPath], {
      stdio: "ignore",
      detached: true,
    });
  } else {
    attemptLaunch([{ cmd: "windsurf", args: [repoPath] }], {
      onFail: () => {
        console.error("❌ Could not find Windsurf CLI ('windsurf').");
        process.exit(1);
      },
    });
  }
}

function openCS(repoPath) {
  if (process.platform === "darwin") {
    spawn("open", ["-a", "Cursor", repoPath], {
      stdio: "ignore",
      detached: true,
    });
  } else {
    attemptLaunch([{ cmd: "cursor", args: [repoPath] }], {
      onFail: () => console.error("❌ Cursor CLI not found."),
    });
  }
}

function openIJ(repoPath) {
  const isWindows = process.platform === "win32";
  const intellijPaths = [];

  if (isWindows) {
    intellijPaths.push({
      cmd: "idea64.exe",
      args: [repoPath],
      paths: [
        path.join(
          process.env.LOCALAPPDATA,
          "JetBrains",
          "IntelliJ*",
          "bin",
          "idea64.exe"
        ),
        path.join(
          process.env.PROGRAMFILES,
          "JetBrains",
          "IntelliJ*",
          "bin",
          "idea64.exe"
        ),
      ],
    });
  } else {
    // macOS paths
    intellijPaths.push(
      { cmd: "open", args: ["-a", "IntelliJ IDEA", repoPath] },
      { cmd: "open", args: ["-a", "IntelliJ IDEA CE", repoPath] },
      { cmd: "open", args: ["-a", "IntelliJ IDEA Ultimate", repoPath] },
      { cmd: "idea", args: [repoPath] }
    );
  }

  // Common paths
  intellijPaths.push(
    { cmd: "idea", args: [repoPath] },
    { cmd: "intellij", args: [repoPath] }
  );

  attemptLaunch(intellijPaths, {
    onFail: () =>
      console.error(
        "❌ IntelliJ IDEA not found. Make sure it's installed and in your PATH."
      ),
  });
}

function openPC(repoPath) {
  const isWindows = process.platform === "win32";
  const pycharmPaths = [];

  if (isWindows) {
    pycharmPaths.push({
      cmd: "pycharm64.exe",
      args: [repoPath],
      paths: [
        path.join(
          process.env.LOCALAPPDATA,
          "Programs",
          "PyCharm*",
          "bin",
          "pycharm64.exe"
        ),
        path.join(
          process.env.PROGRAMFILES,
          "JetBrains",
          "PyCharm*",
          "bin",
          "pycharm64.exe"
        ),
      ],
    });
  } else {
    // macOS paths
    pycharmPaths.push(
      { cmd: "open", args: ["-a", "PyCharm", repoPath] },
      { cmd: "open", args: ["-a", "PyCharm CE", repoPath] },
      { cmd: "open", args: ["-a", "PyCharm Professional", repoPath] },
      { cmd: "pycharm", args: [repoPath] }
    );
  }

  // Common paths
  pycharmPaths.push(
    { cmd: "pycharm", args: [repoPath] },
    { cmd: "pycharm-professional", args: [repoPath] },
    { cmd: "pycharm-community", args: [repoPath] }
  );

  attemptLaunch(pycharmPaths, {
    onFail: () =>
      console.error(
        "❌ PyCharm not found. Make sure it's installed and in your PATH."
      ),
  });
}

function attemptLaunch(candidates) {
  const tryOne = (i) => {
    if (i >= candidates.length) return;
    const { cmd, args } = candidates[i];

    const child = spawn(cmd, args, {
      stdio: "ignore",
      detached: true,
      shell: true,
    });
    child.on("error", () => tryOne(i + 1));
    child.unref?.();
  };

  tryOne(0);
}

// Create server instance
const server = new McpServer({
  name: "openmate",
  version: "1.0.0",
});

// Read package.json using ES modules
const pkg = JSON.parse(
  await fs.promises.readFile(new URL("../package.json", import.meta.url))
);

server.tool(
  "show OpenMate-MCP version",
  "Show the version of OpenMate-MCP",
  "Show the version of OM MCP",
  async () => {
    return {
      content: [{ type: "text", text: `OpenMate-MCP version: ${pkg.version}` }],
    };
  }
);

// List repositories and collections
server.tool(
  "list-repos",
  "List all repositories and collections from OpenMate",
  "List all repositories and collections from OM",
  {
    type: z
      .enum(["all", "repos", "collections"])
      .optional()
      .default("all")
      .describe("What to list: all, repos only, or collections only"),
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
            const repoPath = typeof data === "string" ? data : data.path;
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
            const repos =
              collection.repos || (Array.isArray(collection) ? collection : []);
            output += `  ${index + 1}. ${collection.name || key} (${
              repos.length
            } repos)\n`;
          });
        } else {
          output += "📚 No collections found\n";
        }
      }

      if (!output) {
        output = "No repositories or collections found.";
      }

      return {
        content: [{ type: "text", text: output }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// Add a new repository
server.tool(
  "add-repo",
  "Add a new repository to OpenMate",
  "Add a new repository to OM ",
  {
    name: z.string().min(1).describe("The name to identify this repository"),
    path: z.string().min(1).describe("The filesystem path to the repository"),
  },
  async ({ name, path: repoPath }) => {
    try {
      const store = loadStore();
      const normalized = normalizeName(name);

      if (store.repos[normalized]) {
        return {
          content: [
            { type: "text", text: `❌ Repository '${name}' already exists` },
          ],
        };
      }

      const expandedPath = repoPath.replace(/^~(?=$|[\\/])/, os.homedir());
      const resolvedPath = path.resolve(expandedPath);

      const stats = fs.statSync(resolvedPath);
      if (!stats.isDirectory()) {
        throw new Error("Path is not a directory");
      }

      store.repos[normalized] = {
        path: resolvedPath,
        addedAt: new Date().toISOString(),
      };
      saveStore(store);

      return {
        content: [
          {
            type: "text",
            text: `✅ Added repository '${name}' -> '${resolvedPath}'`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }],
      };
    }
  }
);

// Get repository path
server.tool(
  "get-repo",
  "Get the path of a repository by name from OpenMate",
  "Get the path of a repository by name from OM",
  {
    name: z.string().min(1).describe("The name of the repository to look up"),
  },
  async ({ name }) => {
    try {
      const store = loadStore();
      const normalized = normalizeName(name);
      const repoData = store.repos[normalized];

      if (!repoData) {
        return {
          content: [
            { type: "text", text: `❌ Repository '${name}' not found` },
          ],
        };
      }

      const repoPath = typeof repoData === "string" ? repoData : repoData.path;
      return {
        content: [{ type: "text", text: repoPath }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }],
      };
    }
  }
);

// Remove a repository
server.tool(
  "remove-repo",
  "Remove a repository from OpenMate",
  "Remove a repository from OM",
  {
    name: z.string().min(1).describe("The name of the repository to remove"),
  },
  async ({ name }) => {
    try {
      const store = loadStore();
      const normalized = normalizeName(name);

      if (!store.repos[normalized]) {
        return {
          content: [
            { type: "text", text: `❌ Repository '${name}' not found` },
          ],
        };
      }

      delete store.repos[normalized];
      saveStore(store);

      return {
        content: [{ type: "text", text: `✅ Removed repository '${name}'` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }],
      };
    }
  }
);

// Add a collection
server.tool(
  "add-collection",
  "Create a collection of repositories in OpenMate",
  "Create a collection of repositories in OM",
  {
    name: z.string().min(1).describe("The name of the collection"),
    repos: z
      .string()
      .min(1)
      .describe("Comma-separated list of repository names"),
  },
  async ({ name, repos }) => {
    try {
      const store = loadStore();
      const normalized = normalizeName(name);
      const repoList = repos.split(",").map((r) => normalizeName(r.trim()));

      const missingRepos = repoList.filter((r) => !store.repos[r]);
      if (missingRepos.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Repositories not found: ${missingRepos.join(", ")}`,
            },
          ],
        };
      }

      store.collections[normalized] = {
        name: name,
        repos: repoList,
        createdAt: new Date().toISOString(),
      };
      saveStore(store);

      return {
        content: [
          {
            type: "text",
            text: `✅ Created collection '${name}' with ${repoList.length} repos`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }],
      };
    }
  }
);

// Delete a collection
server.tool(
  "delete-collection",
  "Delete a collection from OpenMate",
  "Delete a collection from OM",
  {
    name: z.string().min(1).describe("The name of the collection to delete"),
  },
  async ({ name }) => {
    try {
      const store = loadStore();
      const normalized = normalizeName(name);

      if (!store.collections[normalized]) {
        return {
          content: [
            { type: "text", text: `❌ Collection '${name}' not found` },
          ],
        };
      }

      delete store.collections[normalized];
      saveStore(store);

      return {
        content: [{ type: "text", text: `✅ Deleted collection '${name}'` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }],
      };
    }
  }
);

// List collection
server.tool(
  "list-collection",
  "List repositories in a collection from OpenMate",
  "List repositories in a collection from OM",
  {
    name: z
      .string()
      .optional()
      .describe("Optional: The name of the collection to list"),
  },
  async ({ name }) => {
    try {
      const store = loadStore();

      if (!name) {
        const collections = Object.keys(store.collections);
        if (collections.length === 0) {
          return {
            content: [{ type: "text", text: "No collections found" }],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: `Available collections: ${collections.join(", ")}`,
            },
          ],
        };
      }

      const normalized = normalizeName(name);
      const collection = store.collections[normalized];

      if (!collection) {
        return {
          content: [
            { type: "text", text: `❌ Collection '${name}' not found` },
          ],
        };
      }

      const repos = collection.repos || [];
      return {
        content: [
          { type: "text", text: `Collection '${name}': ${repos.join(", ")}` },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }],
      };
    }
  }
);

// Initialize current directory
// server.tool(
//   "init-repo",
//   "Add current directory as a repository. Take the path of the current directory as the currentDir",
//   {
//     name: z
//       .string()
//       .min(1)
//       .describe("The name to assign to the current directory"),
//     path: z.string().optional().describe("Optional: The path to the directory"),
//   },
//   async ({ name, path }) => {
//     try {
//       const currentDir = process.cwd();
//       const store = loadStore();
//       const normalized = normalizeName(name);

//       if (store.repos[normalized]) {
//         return {
//           content: [
//             { type: "text", text: `❌ Repository '${name}' already exists` },
//           ],
//         };
//       }

//       store.repos[normalized] = {
//         path: path || currentDir,
//         addedAt: new Date().toISOString(),
//       };
//       saveStore(store);

//       return {
//         content: [
//           { type: "text", text: `✅ Added current directory as '${name}'` },
//         ],
//       };
//     } catch (error) {
//       return {
//         content: [{ type: "text", text: `❌ Error: ${error.message}` }],
//       };
//     }
//   }
// );

// Open repository in IDE
server.tool(
  "open-repo",
  "Open a repository in a specific IDE",
  {
    name: z.string().min(1).describe("The name of the repository to open"),
    ide: z
      .enum(["vs", "ws", "cs", "ij", "pc"])
      .describe(
        "IDE to open in: vs (VS Code), ws (Windsurf), cs (Cursor), ij (IntelliJ), pc (PyCharm)"
      ),
  },
  async ({ name, ide }) => {
    try {
      const store = loadStore();
      const normalized = normalizeName(name);
      const repoData = store.repos[normalized];

      if (!repoData) {
        return {
          content: [
            { type: "text", text: `❌ Repository '${name}' not found` },
          ],
        };
      }

      const repoPath = typeof repoData === "string" ? repoData : repoData.path;

      // Check if path exists
      if (!fs.existsSync(repoPath)) {
        return {
          content: [
            { type: "text", text: `❌ Path does not exist: ${repoPath}` },
          ],
        };
      }

      const ideNames = {
        vs: "VS Code",
        ws: "Windsurf",
        cs: "Cursor",
        ij: "IntelliJ IDEA",
        pc: "PyCharm",
      };

      // Open in the specified IDE
      switch (ide) {
        case "vs":
          openVS(repoPath);
          break;
        case "ws":
          openWS(repoPath);
          break;
        case "cs":
          openCS(repoPath);
          break;
        case "ij":
          openIJ(repoPath);
          break;
        case "pc":
          openPC(repoPath);
          break;
      }

      return {
        content: [
          {
            type: "text",
            text: `🚀 Opening '${name}' in ${ideNames[ide]}...\nPath: ${repoPath}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }],
      };
    }
  }
);

// Open collection in IDE
server.tool(
  "open-collection",
  "Open all repositories in a collection in a specific IDE",
  {
    name: z.string().min(1).describe("The name of the collection to open"),
    ide: z
      .enum(["vs", "ws", "cs", "ij", "pc"])
      .describe(
        "IDE to open in: vs (VS Code), ws (Windsurf), cs (Cursor), ij (IntelliJ), pc (PyCharm)"
      ),
  },
  async ({ name, ide }) => {
    try {
      const store = loadStore();
      const normalized = normalizeName(name);
      const collection = store.collections[normalized];

      if (!collection) {
        return {
          content: [
            { type: "text", text: `❌ Collection '${name}' not found` },
          ],
        };
      }

      const repos = collection.repos || [];
      if (repos.length === 0) {
        return {
          content: [{ type: "text", text: `❌ Collection '${name}' is empty` }],
        };
      }

      const ideNames = {
        vs: "VS Code",
        ws: "Windsurf",
        cs: "Cursor",
        ij: "IntelliJ IDEA",
        pc: "PyCharm",
      };

      let output = `🚀 Opening collection '${name}' (${repos.length} repos) in ${ideNames[ide]}:\n\n`;
      let openedCount = 0;

      for (const repoName of repos) {
        const repoData = store.repos[repoName];
        if (repoData) {
          const repoPath =
            typeof repoData === "string" ? repoData : repoData.path;

          if (fs.existsSync(repoPath)) {
            output += `✅ ${repoName} -> ${repoPath}\n`;

            // Open in the specified IDE
            switch (ide) {
              case "vs":
                openVS(repoPath);
                break;
              case "ws":
                openWS(repoPath);
                break;
              case "cs":
                openCS(repoPath);
                break;
              case "ij":
                openIJ(repoPath);
                break;
              case "pc":
                openPC(repoPath);
                break;
            }
            openedCount++;
          } else {
            output += `❌ ${repoName} -> Path not found: ${repoPath}\n`;
          }
        } else {
          output += `❌ ${repoName} -> Repository not found in store\n`;
        }
      }

      output += `\nOpened ${openedCount} of ${repos.length} repositories.`;

      return {
        content: [{ type: "text", text: output }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `❌ Error: ${error.message}` }],
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
