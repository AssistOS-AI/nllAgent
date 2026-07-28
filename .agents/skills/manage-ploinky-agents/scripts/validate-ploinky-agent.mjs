#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const FORBIDDEN_ENV_KEYS = new Set([
  'PLOINKY_MASTER_KEY',
  'PLOINKY_AGENT_SECRET',
  'PLOINKY_AGENT_ID',
  'USER_SESSION_JWT',
  'PLOINKY_SESSION',
  'ROUTER_REQUEST_JWT',
  'AGENT_ASSERTION_JWT'
]);

const SENSITIVE_KEY_RE = /(MASTER_KEY|AGENT_SECRET|SESSION_JWT|ROUTER_REQUEST_JWT|AGENT_ASSERTION_JWT|ACCESS_TOKEN|AUTHORIZATION|PASSWORD)$/i;
const TOOL_NAME_RE = /^[A-Za-z0-9_.:-]+$/;
const AGENT_RE = /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?$/;
const POLICY_ACCESS = new Set(['authenticated', 'internal', 'admin']);
const HTTP_ROUTE_ACCESS = new Set(['public', 'guest', 'authenticated']);
const POLICY_SOURCE = new Set(['admin', 'mcp-config', 'router:boot', 'system', 'migration']);
const TOOL_TAGS = new Set(['internal', 'admin']);
const INTERNAL_EXACT = new Set(['/policy/command', '/metrics', '/health', '/health/internal']);
const ROUTER_OWNED_FIRST_SEGMENTS = new Set([
  'agent-card',
  'mcp',
  'auth',
  'admin',
  'webtty',
  'webchat',
  'dashboard',
  'status',
  'upload',
  'blobs',
  'workspace-files',
  'api',
  'health',
  'metrics',
  'MCPBrowserClient.js',
  'whitelist'
]);
const REMOVED_SERVICE_SPEC_FIELDS = ['auth', 'mode', 'forceGuest'];

const results = { errors: [], warnings: [], info: [] };

function error(message, where = '') {
  results.errors.push(where ? `${where}: ${message}` : message);
}

function warn(message, where = '') {
  results.warnings.push(where ? `${where}: ${message}` : message);
}

function info(message, where = '') {
  results.info.push(where ? `${where}: ${message}` : message);
}

function usage() {
  return `Usage:
  node validate-ploinky-agent.mjs --agent-dir <path> [--policy-state <policy-state.json>]
  node validate-ploinky-agent.mjs <agent-dir> [--policy-state <policy-state.json>]

Checks manifest.json, mcp-config.json, optional router policy state, and common Ploinky security invariants.`;
}

function parseArgs(argv) {
  const out = { agentDir: undefined, policyState: undefined, help: false };
  const args = [...argv];
  while (args.length) {
    const arg = args.shift();
    if (arg === '--help' || arg === '-h') {
      out.help = true;
    } else if (arg === '--agent-dir') {
      out.agentDir = args.shift();
    } else if (arg === '--policy-state') {
      out.policyState = args.shift();
    } else if (arg.startsWith('--')) {
      error(`unknown option ${arg}`);
    } else if (!out.agentDir) {
      out.agentDir = arg;
    } else {
      error(`unexpected positional argument ${arg}`);
    }
  }
  if (!out.agentDir) out.agentDir = process.cwd();
  return out;
}

function readJson(file, label) {
  if (!existsSync(file)) return undefined;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    error(`invalid JSON: ${e.message}`, label);
    return undefined;
  }
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function checkNoForbiddenEnv(env, where) {
  if (!env) return;
  if (!isPlainObject(env)) {
    warn('env should be an object when present', where);
    return;
  }
  for (const [key, value] of Object.entries(env)) {
    if (FORBIDDEN_ENV_KEYS.has(key)) {
      error(`forbidden env key ${key}; launcher/router owns this`, where);
    } else if (SENSITIVE_KEY_RE.test(key)) {
      warn(`sensitive-looking env key ${key}; verify it is loaded from a safe secret source, not hardcoded`, where);
    }
    if (typeof value === 'string' && /(eyJ[a-zA-Z0-9_-]+\.|PLOINKY_MASTER_KEY|BEGIN PRIVATE KEY)/.test(value)) {
      error(`env value for ${key} looks like an inline token/key`, where);
    }
  }
}

function getArrayLikeServices(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (isPlainObject(value)) return Object.entries(value).map(([slug, config]) => isPlainObject(config) ? { slug, ...config } : { slug, value: config });
  return [{ value }];
}

function fullyDecodeSegment(segment) {
  let current = String(segment);
  for (let i = 0; i < 3; i += 1) {
    let next;
    try {
      next = decodeURIComponent(current);
    } catch {
      break;
    }
    if (next === current) break;
    current = next;
  }
  return current;
}

function hasInternalAgentSegment(input) {
  const pathname = String(input || '').split('?')[0].split('#')[0];
  return pathname.split('/').filter(Boolean).some((segment) => segment === '__agent' || fullyDecodeSegment(segment) === '__agent');
}

function validatePathShape(input, where, { allowWildcard = true } = {}) {
  if (typeof input !== 'string') {
    error('path must be a string', where);
    return undefined;
  }
  let value = input.trim();
  if (!value) {
    error('path must be a non-empty string', where);
    return undefined;
  }
  if (/[a-z][a-z0-9+.-]*:\/\//i.test(value)) error('path contains URL scheme', where);
  if (value.includes('#')) error('path contains fragment', where);
  if (value.includes('?')) {
    warn('path contains query; route access ignores query strings', where);
    value = value.slice(0, value.indexOf('?'));
  }
  if (!value.startsWith('/')) error('path must start with /', where);
  if (value.includes('\0')) error('path contains null byte', where);
  if (value.includes('\\')) error('path contains backslash', where);
  if (value.includes('//')) error('path contains double slash', where);
  if (/%2f|%5c/i.test(value)) error('path contains encoded slash/backslash', where);

  const wildcard = value.endsWith('/*');
  const core = wildcard ? (value.slice(0, -2) || '/') : value;
  const segments = core.split('/');
  if (segments.includes('..') || segments.includes('.')) error('path contains traversal segment', where);

  const stars = value.match(/\*/g) || [];
  if (stars.length > 1) error('path contains more than one wildcard', where);
  if (stars.length === 1 && !wildcard) error('wildcard must be suffix-only /*', where);
  if (stars.length && !allowWildcard) error('wildcard is not allowed here', where);
  if (value.includes('**')) error('globstar wildcard is not allowed', where);
  return value;
}

function validateHttpRouteAccessPath(input, where) {
  const value = validatePathShape(input, where);
  if (!value) return;
  const core = value.endsWith('/*') ? (value.slice(0, -2) || '/') : value;
  if (value === '/' || value === '/*') error('root path cannot be declared in route access policy', where);
  if (INTERNAL_EXACT.has(core)) error('internal route is not route-access controlled', where);
  if (core === '/auth' || core.startsWith('/auth/')) error('auth routes are not route-access controlled', where);
  if (core === '/admin' || core.startsWith('/admin/')) error('admin routes are not route-access controlled', where);
  if (hasInternalAgentSegment(core)) error('agent internal route cannot be route-access controlled', where);
  const firstSegment = core.split('/').filter(Boolean)[0] || '';
  if (ROUTER_OWNED_FIRST_SEGMENTS.has(firstSegment)) error(`router-owned route segment ${firstSegment} is not route-access controlled`, where);
}

function validateManifestRouteAccessPath(input, where) {
  const raw = typeof input === 'string' && input.startsWith('/') ? input : `/${input ?? ''}`;
  const value = validatePathShape(raw, where);
  if (!value) return;
  const core = value.endsWith('/*') ? (value.slice(0, -2) || '/') : value;
  if (value === '/' || value === '/*') error('manifest routerAccess.httpRoutes cannot declare the agent root', where);
  if (hasInternalAgentSegment(core)) error('manifest routerAccess.httpRoutes cannot expose __agent routes', where);
}

function validateServicePrefix(input, where, { internal = false } = {}) {
  const value = validatePathShape(input, where, { allowWildcard: false });
  if (!value) return;
  if (hasInternalAgentSegment(value)) error(`${internal ? 'internal' : 'external'} service prefix cannot target __agent routes`, where);
  if (!value.endsWith('/')) warn('service prefixes should end with / to avoid ambiguous matching', where);
}

function validateEnableEntry(entry, where) {
  if (typeof entry === 'string') {
    if (!entry.trim()) error('enable string cannot be empty', where);
    if (/\bas\s*$/.test(entry)) error('enable alias marker "as" has no alias', where);
    return;
  }
  if (!isPlainObject(entry)) {
    error('enable entry must be a string or object', where);
    return;
  }
  const refKeys = ['agent', 'ref', 'spec', 'name'].filter((k) => typeof entry[k] === 'string' && entry[k].trim());
  if (refKeys.length === 0) error('enable object needs one of agent, ref, spec, or name', where);
  if (entry.noWait !== undefined && typeof entry.noWait !== 'boolean') warn('noWait should be boolean', where);
  if (entry['no-wait'] !== undefined && typeof entry['no-wait'] !== 'boolean') warn('no-wait should be boolean', where);
  const alias = entry.alias ?? entry.as;
  if (alias !== undefined && (typeof alias !== 'string' || !alias.trim())) error('alias/as must be a non-empty string', where);
}

function validateServices(manifest, kind) {
  const services = getArrayLikeServices(manifest[kind]);
  services.forEach((service, index) => {
    const where = `manifest.${kind}[${index}]`;
    if (!isPlainObject(service)) {
      error('service entry must be an object', where);
      return;
    }
    for (const field of REMOVED_SERVICE_SPEC_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(service, field)) {
        error(`HTTP service field ${field} was removed; use access: public, guest, or authenticated`, where);
      }
    }
    const access = service.access;
    if (!HTTP_ROUTE_ACCESS.has(String(access || ''))) {
      error('HTTP service requires access: public, guest, or authenticated', `${where}.access`);
    }
    const external = service.externalPrefix ?? service.prefix ?? service.path;
    if (external !== undefined) validateServicePrefix(external, `${where}.externalPrefix`);
    if (external === undefined && !service.slug && !service.name) {
      error('HTTP service needs slug/name or an explicit externalPrefix', where);
    }
    const internal = service.internalPrefix ?? service.targetPrefix ?? service.upstreamPrefix;
    if (internal !== undefined) validateServicePrefix(internal, `${where}.internalPrefix`, { internal: true });
    if (Array.isArray(service.delegations) && service.access !== 'authenticated') {
      error('delegations are only supported for authenticated HTTP services', `${where}.delegations`);
    }
    if (service.access === 'public' && service.includeAuthInfo === true) {
      warn('public HTTP services do not receive router auth info even if includeAuthInfo is true', where);
    }
    if (service.access === 'public' && service.invocation !== false) {
      info('public HTTP service will not receive invocation metadata by default', where);
    } else if (service.invocation === false) {
      info('invocation token disabled for this service', where);
    }
  });
}

function getManifestRouteSpecs(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((spec) => ({ spec }));
  if (isPlainObject(value)) {
    return Object.entries(value).map(([routePath, routeValue]) => ({
      spec: isPlainObject(routeValue) ? { path: routePath, ...routeValue } : { path: routePath, access: routeValue }
    }));
  }
  return [{ spec: value }];
}

function validateManifestRouteAccess(manifest) {
  const where = 'manifest.routerAccess.httpRoutes';
  const routerAccess = manifest.routerAccess;
  if (routerAccess === undefined) return;
  if (!isPlainObject(routerAccess)) {
    error('routerAccess must be an object', 'manifest.routerAccess');
    return;
  }
  const httpRoutes = routerAccess.httpRoutes;
  if (httpRoutes === undefined) return;
  if (!Array.isArray(httpRoutes) && !isPlainObject(httpRoutes)) {
    error('httpRoutes must be an array or object', where);
    return;
  }
  getManifestRouteSpecs(httpRoutes).forEach(({ spec }, index) => {
    const entryWhere = `${where}[${index}]`;
    if (!isPlainObject(spec)) {
      error('route access entry must be an object or object-map value', entryWhere);
      return;
    }
    if (Object.prototype.hasOwnProperty.call(spec, 'mode')) {
      error('routerAccess.httpRoutes entries must use access, not mode', entryWhere);
    }
    if (!HTTP_ROUTE_ACCESS.has(String(spec.access || ''))) {
      error('access must be public, guest, or authenticated', `${entryWhere}.access`);
    }
    validateManifestRouteAccessPath(spec.path, `${entryWhere}.path`);
  });
}

function validateManifest(manifest, manifestPath) {
  if (manifest === undefined) {
    warn(`manifest.json not found at ${manifestPath}`);
    return;
  }
  const where = 'manifest.json';
  if (!isPlainObject(manifest)) {
    error('manifest root must be an object', where);
    return;
  }

  if (manifest.container && manifest.image) warn('both container and image are set; verify precedence is intentional', where);
  if (manifest.start && !(manifest.readiness && manifest.readiness.protocol)) {
    warn('start is set without explicit readiness.protocol; readiness may default to TCP', where);
  }
  if ((manifest.agent || manifest.commands?.run) && !(manifest.readiness && manifest.readiness.protocol)) {
    warn('explicit agent command is set without explicit readiness.protocol', where);
  }
  if (!manifest.start && !manifest.agent && !manifest.commands?.run) {
    info('no custom runtime command; bundled AgentServer should launch /mcp', where);
  }
  if (manifest.readiness?.protocol && !['tcp', 'mcp', 'none'].includes(manifest.readiness.protocol)) {
    error(`unknown readiness.protocol ${manifest.readiness.protocol}`, where);
  }

  checkNoForbiddenEnv(manifest.env, 'manifest.env');
  if (isPlainObject(manifest.profiles)) {
    for (const [profileName, profile] of Object.entries(manifest.profiles)) {
      if (!isPlainObject(profile)) {
        error('profile must be an object', `manifest.profiles.${profileName}`);
        continue;
      }
      checkNoForbiddenEnv(profile.env, `manifest.profiles.${profileName}.env`);
      if (profile.enable) {
        const entries = Array.isArray(profile.enable) ? profile.enable : [profile.enable];
        entries.forEach((entry, i) => validateEnableEntry(entry, `manifest.profiles.${profileName}.enable[${i}]`));
      }
    }
  }

  if (manifest.enable) {
    const entries = Array.isArray(manifest.enable) ? manifest.enable : [manifest.enable];
    entries.forEach((entry, i) => validateEnableEntry(entry, `manifest.enable[${i}]`));
  }

  if (manifest.guest === true) warn('guest:true enables guest-capable routing; verify guest exposure is deliberate', where);
  validateServices(manifest, 'httpServices');
  if (manifest.publicServices !== undefined) {
    error('publicServices was removed; use httpServices with access: public', 'manifest.publicServices');
  }
  validateManifestRouteAccess(manifest);

  if (manifest.endpoints?.chatCompletions) {
    warn('/v1/chat/completions configured; verify it cannot invoke admin/internal tools implicitly', 'manifest.endpoints.chatCompletions');
  }
}

function tagsToAccess(tags, where) {
  if (tags === undefined || (Array.isArray(tags) && tags.length === 0)) return 'authenticated';
  if (!Array.isArray(tags)) {
    error('tags must be an array when present', where);
    return 'invalid';
  }
  const normalized = tags.map((tag) => String(tag));
  for (const tag of normalized) {
    if (tag === 'authenticated') {
      error('do not use explicit authenticated tag; omit tags or use [] for authenticated default', where);
    } else if (!TOOL_TAGS.has(tag)) {
      error(`unknown tool tag ${tag}; valid tags are internal and admin, or omit tags`, where);
    }
  }
  const hasInternal = normalized.includes('internal');
  const hasAdmin = normalized.includes('admin');
  if (hasInternal && hasAdmin) error('tool cannot be both internal and admin', where);
  if (hasInternal) return 'internal';
  if (hasAdmin) return 'admin';
  return 'authenticated';
}

function validateTool(tool, index, seen, derivedPolicy) {
  const where = `mcp-config.tools[${index}]`;
  if (!isPlainObject(tool)) {
    error('tool entry must be an object', where);
    return;
  }
  if (!tool.name || typeof tool.name !== 'string') {
    error('tool.name is required', where);
  } else {
    if (!TOOL_NAME_RE.test(tool.name)) warn(`tool name ${tool.name} contains unusual characters`, where);
    if (seen.has(tool.name)) error(`duplicate tool name ${tool.name}`, where);
    seen.add(tool.name);
  }

  if (!tool.command || typeof tool.command !== 'string') error('tool.command is required and must be a string', where);
  if (tool.args !== undefined && !Array.isArray(tool.args)) warn('tool.args should be an array', where);
  if (tool.cwd !== undefined && typeof tool.cwd !== 'string') warn('tool.cwd should be a string', where);
  if (tool.timeoutMs !== undefined && (!Number.isFinite(tool.timeoutMs) || tool.timeoutMs <= 0)) warn('timeoutMs should be positive number', where);
  if (tool.timeout !== undefined && (!Number.isFinite(tool.timeout) || tool.timeout <= 0)) warn('timeout should be positive number', where);
  if (tool.inputSchema !== undefined && !isPlainObject(tool.inputSchema)) error('inputSchema must be an object', where);
  if (tool.inputSchema && tool.inputSchema.additionalProperties !== false) warn('inputSchema should usually set additionalProperties:false', where);
  if (tool.async !== undefined && typeof tool.async !== 'boolean') warn('async should be boolean', where);
  checkNoForbiddenEnv(tool.env, `${where}.env`);

  const access = tagsToAccess(tool.tags, `${where}.tags`);
  if (tool.name && access !== 'invalid') derivedPolicy.push({ tool: tool.name, access, tags: tool.tags ?? [] });
  if ((access === 'internal' || access === 'admin') && !tool.description) warn('privileged tools should have explicit description', where);
}

function validateResource(resource, index, seen) {
  const where = `mcp-config.resources[${index}]`;
  if (!isPlainObject(resource)) {
    error('resource entry must be an object', where);
    return;
  }
  if (!resource.name || typeof resource.name !== 'string') error('resource.name is required', where);
  else if (seen.has(resource.name)) error(`duplicate resource name ${resource.name}`, where);
  else seen.add(resource.name);

  if (!resource.uri && !resource.template) warn('resource should define uri or template', where);
  if (!resource.command) warn('resource command not found; verify runtime supports this resource shape', where);
  if (resource.args !== undefined && !Array.isArray(resource.args)) warn('resource.args should be an array', where);
  checkNoForbiddenEnv(resource.env, `${where}.env`);
}

function validateMcpConfig(config, configPath) {
  const derivedPolicy = [];
  if (config === undefined) {
    warn(`mcp-config.json not found at ${configPath}`);
    return derivedPolicy;
  }
  if (!isPlainObject(config)) {
    error('mcp-config root must be an object', 'mcp-config.json');
    return derivedPolicy;
  }

  if (config.tools !== undefined && !Array.isArray(config.tools)) error('tools must be an array', 'mcp-config.tools');
  const toolNames = new Set();
  (Array.isArray(config.tools) ? config.tools : []).forEach((tool, index) => validateTool(tool, index, toolNames, derivedPolicy));

  if (config.resources !== undefined && !Array.isArray(config.resources)) error('resources must be an array', 'mcp-config.resources');
  const resourceNames = new Set();
  (Array.isArray(config.resources) ? config.resources : []).forEach((resource, index) => validateResource(resource, index, resourceNames));

  if (config.prompts !== undefined && !Array.isArray(config.prompts)) error('prompts must be an array', 'mcp-config.prompts');
  return derivedPolicy;
}

function validatePolicyState(policy, policyPath, derivedPolicy) {
  if (!policyPath) return;
  if (policy === undefined) {
    error(`policy state not found at ${policyPath}`);
    return;
  }
  if (!isPlainObject(policy)) {
    error('policy root must be an object', 'policy-state');
    return;
  }
  if (policy.schema !== 'router-policy') warn('policy.schema should be router-policy', 'policy-state.schema');

  if (!Array.isArray(policy.httpRoutes)) error('httpRoutes must be an array', 'policy-state.httpRoutes');
  const httpSeen = new Set();
  (Array.isArray(policy.httpRoutes) ? policy.httpRoutes : []).forEach((route, index) => {
    const where = `policy-state.httpRoutes[${index}]`;
    if (!isPlainObject(route)) {
      error('httpRoute entry must be an object', where);
      return;
    }
    validateHttpRouteAccessPath(route.path, `${where}.path`);
    if (!HTTP_ROUTE_ACCESS.has(String(route.access || ''))) {
      error('httpRoutes entries require access: public, guest, or authenticated', `${where}.access`);
    }
    if (httpSeen.has(route.path)) error(`duplicate http route ${route.path}`, where);
    httpSeen.add(route.path);
    if (route.enabled !== undefined && typeof route.enabled !== 'boolean') warn('enabled should be boolean', where);
  });

  if (!Array.isArray(policy.mcpTools)) error('mcpTools must be an array', 'policy-state.mcpTools');
  const mcpSeen = new Set();
  const persistedByTool = new Map();
  (Array.isArray(policy.mcpTools) ? policy.mcpTools : []).forEach((entry, index) => {
    const where = `policy-state.mcpTools[${index}]`;
    if (!isPlainObject(entry)) {
      error('mcpTool entry must be an object', where);
      return;
    }
    if (!entry.agent || typeof entry.agent !== 'string') error('agent is required', where);
    else if (!AGENT_RE.test(entry.agent)) warn(`agent ${entry.agent} has unusual shape`, where);
    if (!entry.tool || typeof entry.tool !== 'string') error('tool is required', where);
    if (entry.access && !POLICY_ACCESS.has(entry.access)) error(`unknown access ${entry.access}`, where);
    if (entry.source && !POLICY_SOURCE.has(entry.source)) warn(`unknown source ${entry.source}; verify migration compatibility`, where);
    if (entry.enabled !== undefined && typeof entry.enabled !== 'boolean') warn('enabled should be boolean', where);

    const key = `${entry.agent}:${entry.tool}`;
    if (mcpSeen.has(key)) error(`duplicate MCP policy ${key}`, where);
    mcpSeen.add(key);
    if (entry.tool) persistedByTool.set(entry.tool, entry);
  });

  for (const derived of derivedPolicy) {
    const persisted = persistedByTool.get(derived.tool);
    if (!persisted) {
      warn(`no persisted policy entry for tool ${derived.tool}; runtime should fail closed unless bootstrapped from mcp-config`, 'policy-state');
      continue;
    }
    if (persisted.source === 'admin' && persisted.access !== derived.access) {
      info(`tool ${derived.tool}: persisted admin policy ${persisted.access} intentionally overrides mcp-config default ${derived.access}`, 'policy-state');
    } else if (persisted.access !== derived.access) {
      warn(`tool ${derived.tool}: persisted policy ${persisted.access} differs from mcp-config default ${derived.access}`, 'policy-state');
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return 0;
  }

  const agentDir = path.resolve(args.agentDir);
  const manifestPath = path.join(agentDir, 'manifest.json');
  const mcpConfigPath = path.join(agentDir, 'mcp-config.json');
  const policyPath = args.policyState ? path.resolve(args.policyState) : undefined;

  info(`agent directory: ${agentDir}`);

  const manifest = readJson(manifestPath, 'manifest.json');
  const mcpConfig = readJson(mcpConfigPath, 'mcp-config.json');
  const policy = policyPath ? readJson(policyPath, 'policy-state') : undefined;

  validateManifest(manifest, manifestPath);
  const derivedPolicy = validateMcpConfig(mcpConfig, mcpConfigPath);
  validatePolicyState(policy, policyPath, derivedPolicy);

  const printSection = (title, values) => {
    if (!values.length) return;
    console.log(`\n${title}`);
    for (const value of values) console.log(`- ${value}`);
  };

  printSection('Info', results.info);
  printSection('Warnings', results.warnings);
  printSection('Errors', results.errors);

  if (results.errors.length) {
    console.log(`\nFAIL: ${results.errors.length} error(s), ${results.warnings.length} warning(s).`);
    return 1;
  }
  console.log(`\nPASS: 0 errors, ${results.warnings.length} warning(s).`);
  return results.warnings.length ? 0 : 0;
}

process.exitCode = main();
