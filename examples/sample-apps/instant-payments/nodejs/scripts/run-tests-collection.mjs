import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "newman";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const collectionPath = path.join(scriptsDir, "collection.json");

function parseArgs(argv) {
  const opts = { step: undefined, folder: [], delayRequest: 500, baseUrl: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--step" || arg === "-s") {
      opts.step = argv[++i];
    } else if (arg === "--folder" || arg === "-f") {
      opts.folder.push(argv[++i]);
    } else if (arg === "--delay") {
      opts.delayRequest = Number.parseInt(argv[++i], 10);
    } else if (arg === "--base-url" || arg === "-b") {
      opts.baseUrl = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      opts.help = true;
    }
  }
  return opts;
}

function printHelp() {
  console.log(`Usage: node scripts/run-tests-collection.mjs [options]

Options:
  --step, -s <id>       Run one step only (e.g. 1.18 → "Step 1.18 - ...")
  --folder, -f <name>   Run a story folder (repeatable; Newman --folder)
  --delay <ms>          Delay between requests (default: 500)
  --base-url, -b <url>  Override collection baseUrl (default: http://localhost:\${PORT||8080})
  --help, -h            Show this help

Examples:
  node scripts/run-tests-collection.mjs --step 1.18
  node scripts/run-tests-collection.mjs -f "Story 1 - Outbound payment creation with idempotency"
  npm run test:collection -- --step 1.18
`);
}

/** Steps that need collection variables set by earlier steps in the same run. */
const STEP_DEPENDENCIES = {
  "3.3": "Stories 1–2 (paymentId from 1.1, completed in 2.1)",
  "7.16": "Step 7.14 (merchantIndexNextTokenForCrossRoute)",
  "7.17": "Step 7.14 (merchantListNextToken)",
  "8.11": "Step 8.6 (merchantStateNextTokenForCrossRoute)",
  "8.12": "Step 8.6 (merchantStateListNextToken)",
  "8.14": "Story 7 seed data (exactly 4 COMPLETED items for merchantIdGsi)",
};

function warnStepDependencies(stepId) {
  const note = STEP_DEPENDENCIES[stepId];
  if (note) {
    console.warn(
      `Note: step ${stepId} depends on ${note}. Run the full story/folder, not --step alone, unless those vars are already set.`,
    );
  }
}

/** Keep requests whose name starts with "Step {id} -" (e.g. step id "1.18"). */
function filterCollectionByStep(collection, stepId) {
  const prefix = `Step ${stepId} -`;
  const matches = [];

  function walk(items, parents) {
    for (const item of items ?? []) {
      if (item.request && item.name?.startsWith(prefix)) {
        matches.push({ item, parents });
      }
      if (item.item) {
        walk(item.item, [...parents, item]);
      }
    }
  }

  walk(collection.item, []);

  if (matches.length === 0) {
    throw new Error(`No request matching "${prefix}*" in collection.json`);
  }
  if (matches.length > 1) {
    const names = matches.map(({ item }) => item.name).join(", ");
    throw new Error(`Multiple requests match "${prefix}*": ${names}`);
  }

  const { item, parents } = matches[0];
  const storyFolder = parents.at(-1);
  return {
    ...collection,
    item: storyFolder
      ? [{ ...storyFolder, item: [item] }]
      : [item],
  };
}

function loadCollection({ step, folder }) {
  const raw = fs.readFileSync(collectionPath, "utf8");
  const collection = JSON.parse(raw);

  if (step) {
    if (folder.length > 0) {
      throw new Error("Use either --step or --folder, not both");
    }
    return filterCollectionByStep(collection, step);
  }

  return collection;
}

const opts = parseArgs(process.argv.slice(2));

if (opts.help) {
  printHelp();
  process.exit(0);
}

const collection = loadCollection(opts);

if (opts.step) {
  warnStepDependencies(opts.step);
}

const envVars = [];
if (opts.baseUrl) {
  envVars.push({ key: "baseUrl", value: opts.baseUrl });
}

run(
  {
    collection,
    folder: opts.folder.length > 0 ? opts.folder : undefined,
    envVar: envVars.length > 0 ? envVars : undefined,
    reporters: "cli",
    delayRequest: opts.delayRequest ?? 500,
  },
  (err, summary) => {
    if (err) {
      throw err;
    }
    if (summary.run.failures.length > 0) {
      process.exit(1);
    }
    console.log("collection run complete!");
  },
);
