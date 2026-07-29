import { runAdvancedScenario } from './scenario.mjs';

const result = await runAdvancedScenario();
process.stdout.write(result.report);
