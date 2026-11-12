// Expo's default config already understands npm workspaces (packages/shared is resolved from the repo root).
// Extra: ignore Claude Code agent worktrees (<repo>/.claude/worktrees/*), full checkouts Metro would otherwise crawl.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const worktrees = path.resolve(__dirname, "../../.claude/worktrees").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const block = config.resolver.blockList;
config.resolver.blockList = [...(Array.isArray(block) ? block : block ? [block] : []), new RegExp(`^${worktrees}[\\\\/].*`)];

module.exports = config;
