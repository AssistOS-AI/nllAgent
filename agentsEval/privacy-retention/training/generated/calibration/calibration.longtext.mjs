import { longTextProgram, source } from '../../../../../src/longtext/api.mjs';
import { materializePrivacyRetention } from './privacy-retention.materializer.mjs';

const calibrationText = `# Retention calibration

RETENTION | id=CAL1 | category=calibration-record | years=6 | scope=scope-cal1

COVERAGE | scope=scope-cal1 | exceptions=closed
`;

const calibrationSource = source('privacy-retention-calibration.md', calibrationText, 'calibration-v1');

export default longTextProgram(
  'privacy-retention-calibration',
  calibrationSource,
  ...materializePrivacyRetention({ source: calibrationSource })
);

