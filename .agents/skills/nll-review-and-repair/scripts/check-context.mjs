#!/usr/bin/env node

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const role = "independent review";
const expectedPurpose = "REVIEW";
const contextPath = process.argv[2];

if (!contextPath || process.argv.length !== 3) {
  fail("CTX_USAGE", "Usage: node check-context.mjs <context/agent-context.mjs>");
}

const context = await loadContext(contextPath);
const diagnostics = validateCommonContract(context);

requirePurpose(context, expectedPurpose, diagnostics);
requirePopulated(context, "ontology", diagnostics,
  "review requires the selected ontology signature");
for (const [field, explanation] of [
  ["theorySources", "review requires indexed authority sources"],
  ["circuits", "review requires the selected circuit set"],
  ["providers", "review requires provider pins"],
  ["sdkImports", "review requires the SDK boundary"],
  ["commands", "review requires reproducible validation commands"],
  ["tests", "review requires concrete tests"],
  ["benchmarks", "review requires semantic benchmarks"],
]) {
  requirePopulated(context, field, diagnostics, explanation);
}

finish(context, diagnostics);

async function loadContext(file) {
  try {
    const module = await import(pathToFileURL(resolve(file)).href);
    if (!("default" in module)) {
      fail("CTX_DEFAULT_EXPORT", "AgentAuthoringContext module has no default export");
    }
    return module.default;
  } catch (error) {
    fail("CTX_IMPORT", error instanceof Error ? error.message : String(error));
  }
}

function validateCommonContract(value) {
  const found = [];
  if (!isObject(value)) {
    found.push(diagnostic("CTX_VALUE", "default export must be an AgentAuthoringContext value"));
    return found;
  }

  if (value.kind !== "AgentAuthoringContext") {
    found.push(diagnostic("CTX_KIND", "kind must equal AgentAuthoringContext"));
  }
  requireString(value, "id", found);
  requireString(value, "digest", found);

  for (const field of [
    "purpose", "agent", "ontology", "circuits", "materializationProfile", "semanticDemand",
    "sdkImports", "commands", "theorySources", "methodCatalog", "providers",
    "tests", "benchmarks",
  ]) {
    if (!(field in value) || value[field] === null || value[field] === undefined) {
      found.push(diagnostic("CTX_FIELD", `missing public field ${field}`));
    }
  }

  if (isObject(value.agent)) {
    requireString(value.agent, "id", found, "agent.");
    if (!agentBuild(value.agent)) {
      found.push(diagnostic("CTX_BUILD", "agent.build must be a public string or AgentBuildIdentity"));
    }
  } else {
    found.push(diagnostic("CTX_AGENT", "agent must expose public id and build fields"));
  }

  for (const field of [
    "ontology", "circuits", "sdkImports", "commands", "theorySources", "providers",
    "tests", "benchmarks",
  ]) {
    if (field in value && collectionSize(value[field]) === null) {
      found.push(diagnostic("CTX_COLLECTION", `${field} must be an array, Set, Map, or public sized iterable`));
    }
  }

  return found;
}

function requirePurpose(value, expected, found) {
  if (value?.purpose !== expected) {
    found.push(diagnostic("CTX_PURPOSE", `purpose must equal ${expected} for this skill`));
  }
}

function agentBuild(agent) {
  const value = agent.build
    ?? (typeof agent.value === "function" ? agent.value("build") : undefined);
  if (typeof value === "string" && value.trim() !== "") return value;
  if (isObject(value) && typeof value.id === "string" && value.id.trim() !== ""
    && typeof value.agentId === "string" && value.agentId.trim() !== "") return value.id;
  return null;
}

function requireString(value, field, found, prefix = "") {
  if (typeof value[field] !== "string" || value[field].trim() === "") {
    found.push(diagnostic("CTX_STRING", `${prefix}${field} must be a non-empty string`));
  }
}

function requirePopulated(value, field, found, explanation) {
  const size = collectionSize(value?.[field]);
  if (size === 0 || size === null) {
    found.push(diagnostic("CTX_EMPTY", `${field}: ${explanation}`));
  }
}

function collectionSize(value) {
  if (Array.isArray(value)) return value.length;
  if (value instanceof Set || value instanceof Map) return value.size;
  if (!isObject(value)) return null;
  if (Number.isInteger(value.size) && value.size >= 0) return value.size;
  if (Number.isInteger(value.length) && value.length >= 0) return value.length;
  if (typeof value[Symbol.iterator] === "function") {
    const iterator = value[Symbol.iterator]();
    return iterator.next().done ? 0 : 1;
  }
  return null;
}

function isObject(value) {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}

function diagnostic(code, message) {
  return Object.freeze({ code, message });
}

function finish(value, found) {
  if (found.length > 0) {
    for (const item of found) process.stderr.write(`${item.code}: ${item.message}\n`);
    process.exit(1);
  }
  process.stdout.write(`AgentAuthoringContext valid for ${role}\n`);
  process.stdout.write(`context: ${value.id}\n`);
  process.stdout.write(`agent: ${value.agent.id}@${agentBuild(value.agent)}\n`);
  process.stdout.write(`tests: ${collectionSize(value.tests)}\n`);
  process.stdout.write(`benchmarks: ${collectionSize(value.benchmarks)}\n`);
}

function fail(code, message) {
  process.stderr.write(`${code}: ${message}\n`);
  process.exit(1);
}
