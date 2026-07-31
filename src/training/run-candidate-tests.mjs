import { pathToFileURL } from 'node:url';

if (!process.argv[2]) throw new Error('At least one candidate test module is required.');
for (const path of process.argv.slice(2)) await import(pathToFileURL(path).href);
