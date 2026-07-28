import { randomBytes } from 'node:crypto';

function sortableId(prefix, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 17);
  return `${prefix}-${stamp}-${randomBytes(6).toString('hex')}`;
}

export { sortableId };
