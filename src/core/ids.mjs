import { randomBytes } from 'node:crypto';

function sortableId(prefix) {
  const time = new Date().toISOString().replaceAll(/[-:.TZ]/gu, '');
  return `${prefix}-${time}-${randomBytes(5).toString('hex')}`;
}

export { sortableId };
