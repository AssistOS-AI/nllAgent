import { sha256Bytes } from '../core/canonical.mjs';

function anchor(sourceId, revision, text, start, end, blockId, structuralPath = []) {
  const points = Array.from(text);
  const quote = points.slice(start, end).join('');
  return {
    id: `anchor:${blockId}`,
    source: sourceId,
    revision,
    range: { unit: 'unicode-code-point', start, end },
    quote,
    block: blockId,
    structuralPath: [...structuralPath],
    context: {
      prefix: points.slice(Math.max(0, start - 24), start).join(''),
      suffix: points.slice(end, Math.min(points.length, end + 24)).join('')
    },
    digest: sha256Bytes(quote)
  };
}

function parseMarkdown(text, options = {}) {
  const originalDigest = sha256Bytes(text);
  const lineEnding = text.includes('\r\n') ? (text.replace(/\r\n/gu, '').includes('\n') ? 'mixed' : 'crlf') : 'lf';
  text = text.replace(/\r\n/gu, '\n').replace(/\r/gu, '\n');
  const sourceId = options.sourceId || 'source:input';
  const revision = sha256Bytes(text);
  const lines = text.split(/(?<=\n)/u);
  const blocks = [];
  const headings = [];
  let pointCursor = 0;
  let paragraph = [];
  let paragraphStart = 0;
  let blockSequence = 0;
  let codeFence = null;
  let codeLines = [];
  let codeStart = 0;
  const identityCounts = new Map();
  const headingPath = [];

  function slug(value) {
    return value.toLocaleLowerCase().normalize('NFKD').replace(/\p{M}/gu, '')
      .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/gu, '') || 'section';
  }

  function addBlock(kind, value, start, details = {}) {
    if (!value) return null;
    blockSequence += 1;
    const identity = `${kind}:${sha256Bytes(`${headingPath.join('/')}\u0000${value}`).slice(7, 19)}`;
    const occurrence = (identityCounts.get(identity) || 0) + 1;
    identityCounts.set(identity, occurrence);
    const id = `block:${identity}:${occurrence}`;
    const at = anchor(sourceId, revision, text, start, start + Array.from(value).length, id, headingPath);
    const block = { id, kind, text: value, anchor: at, order: blockSequence, path: [...headingPath], ...details };
    blocks.push(block);
    return block;
  }

  function flushParagraph() {
    if (paragraph.length === 0) return;
    const value = paragraph.join('').replace(/\n$/u, '');
    const length = Array.from(value).length;
    if (value.trim()) {
      addBlock('paragraph', value, paragraphStart);
    }
    paragraph = [];
  }

  for (const line of lines) {
    const lineLength = Array.from(line).length;
    const withoutNewline = line.replace(/\r?\n$/u, '');
    const fence = /^\s*(```+|~~~+)\s*([^\s]*)?.*$/u.exec(withoutNewline);
    if (codeFence) {
      codeLines.push(line);
      if (fence && fence[1][0] === codeFence[0]) {
        const value = codeLines.join('').replace(/\r?\n$/u, '');
        addBlock('code-block', value, codeStart, { language: codeFence[1] || null, fenced: true });
        codeFence = null;
        codeLines = [];
      }
      pointCursor += lineLength;
      continue;
    }
    if (fence) {
      flushParagraph();
      codeFence = [fence[1][0], fence[2] || null];
      codeStart = pointCursor;
      codeLines = [line];
      pointCursor += lineLength;
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/u.exec(withoutNewline);
    const listItem = /^\s*(?:[-*+]|\d+[.)])\s+(.+)$/u.exec(withoutNewline);
    const quote = /^\s*>\s?(.*)$/u.exec(withoutNewline);
    const thematicBreak = /^\s*(?:\*\s*){3,}$|^\s*(?:-\s*){3,}$|^\s*(?:_\s*){3,}$/u.test(withoutNewline);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      headingPath.length = level - 1;
      headingPath[level - 1] = slug(heading[2]);
      const block = addBlock('heading', withoutNewline, pointCursor, { level, content: heading[2], path: [...headingPath] });
      headings.push(block);
    } else if (thematicBreak) {
      flushParagraph();
      addBlock('thematic-break', withoutNewline, pointCursor);
    } else if (listItem) {
      flushParagraph();
      addBlock('list-item', withoutNewline, pointCursor, { content: listItem[1] });
    } else if (quote) {
      flushParagraph();
      addBlock('quote', withoutNewline, pointCursor, { content: quote[1] });
    } else if (withoutNewline.trim() === '') {
      flushParagraph();
    } else {
      if (paragraph.length === 0) paragraphStart = pointCursor;
      paragraph.push(line);
    }
    pointCursor += lineLength;
  }
  flushParagraph();
  if (codeFence) {
    const value = codeLines.join('').replace(/\r?\n$/u, '');
    addBlock('code-block', value, codeStart, { language: codeFence[1] || null, fenced: false });
  }

  const observations = [];
  for (const block of blocks) {
    observations.push({
      id: `observation:${block.id}`, type: `document.${block.kind}@1`,
      status: 'extracted', scope: 'view:whole', anchors: [block.anchor.id],
      support: [block.anchor.id], alternatives: [], confidence: 1,
      payload: {
        text: block.text, order: block.order,
        structuralRole: block.kind === 'paragraph' && /^[—–]\s*/u.test(block.text.trimStart())
          ? 'dialogue-line-candidate' : block.kind,
        ...(block.content !== undefined ? { content: block.content } : {}),
        ...(block.level ? { level: block.level } : {}),
        ...(block.kind === 'code-block' ? { language: block.language, fenced: block.fenced } : {})
      },
      provenance: { producer: 'markdown-structural@1', source: sourceId }
    });
    if (['paragraph', 'quote', 'list-item'].includes(block.kind)) {
      for (const sentence of splitSentences(block, text)) observations.push(sentence);
    }
  }

  let lineStart = 0;
  let lineNumber = 0;
  for (const line of lines) {
    lineNumber += 1;
    const value = line.replace(/\r?\n$/u, '');
    const length = Array.from(value).length;
    const lineAnchor = anchor(sourceId, revision, text, lineStart, lineStart + length, `line:${lineNumber}`, ['line', String(lineNumber)]);
    observations.push({
      id: `observation:line:${lineNumber}`, type: 'document.line@1', status: 'extracted',
      scope: 'view:whole', anchors: [lineAnchor.id], support: [lineAnchor.id], alternatives: [], confidence: 1,
      payload: { text: value, line: lineNumber },
      embeddedAnchor: lineAnchor, provenance: { producer: 'markdown-structural@1', source: sourceId }
    });
    lineStart += Array.from(line).length;
  }

  const allAnchors = Object.fromEntries(blocks.map((block) => [block.anchor.id, block.anchor]));
  for (const observation of observations) {
    if (observation.embeddedAnchor) allAnchors[observation.embeddedAnchor.id] = observation.embeddedAnchor;
  }
  const diagnostics = sourceDiagnostics(text, options);
  return {
    kind: 'LongTextProgram', dialect: 'longtextjs-json@1', id: options.programId || 'longtext:input',
    source: {
      id: sourceId, revision, originalDigest, mediaType: 'text/markdown',
      language: options.language || 'und', lineEnding, encoding: 'utf-8',
      channels: ['body'],
      structure: { dialect: 'markdown-block-tree@1', root: 'scope:document' },
      content: text
    },
    anchors: allAnchors,
    schemas: ['document.markdown@1'],
    scopes: [{ id: 'scope:document', kind: 'document', source: sourceId }],
    worlds: [{ id: 'world:source', assumptions: [], mutuallyExclusiveWith: [] }],
    mentions: [],
    entities: [],
    identityCandidates: [],
    views: [{
      id: 'view:whole', source: sourceId, scope: 'scope:document',
      blockIds: blocks.map((block) => block.id), complete: true,
      selection: { kind: 'all-blocks', order: 'source-order' }
    }],
    blocks,
    observations,
    task: options.task || {
      goal: 'apply-active-natural-linter-release',
      scope: 'view:whole',
      absencePolicy: 'declared-coverage-only',
      desiredGuarantee: 'evidence-certified-or-better',
      budgets: { modelCalls: 100, dynamicRounds: 2 },
      reviewPolicy: { modelJudgments: 'review-required', conflicts: 'review-required' },
      expectedOutput: 'CNLAuditReport@1'
    },
    capabilities: [
      { type: 'document.block@1', producer: 'markdown-structural@1', coverage: 'closed', statuses: ['extracted'] },
      { type: 'document.paragraph@1', producer: 'markdown-structural@1', coverage: 'closed', statuses: ['extracted'] },
      { type: 'document.heading@1', producer: 'markdown-structural@1', coverage: 'closed', statuses: ['extracted'] },
      { type: 'document.sentence@1', producer: 'markdown-structural@1', coverage: 'closed', statuses: ['extracted'] },
      { type: 'document.line@1', producer: 'markdown-structural@1', coverage: 'closed', statuses: ['extracted'] },
      { type: 'document.list-item@1', producer: 'markdown-structural@1', coverage: 'closed', statuses: ['extracted'] },
      { type: 'document.quote@1', producer: 'markdown-structural@1', coverage: 'closed', statuses: ['extracted'] },
      { type: 'document.code-block@1', producer: 'markdown-structural@1', coverage: 'closed', statuses: ['extracted'] },
      { type: 'document.thematic-break@1', producer: 'markdown-structural@1', coverage: 'closed', statuses: ['extracted'] }
    ],
    coverage: [{
      id: 'coverage:markdown-structural', source: sourceId, revision, scope: 'view:whole',
      types: ['document.block@1', 'document.paragraph@1', 'document.heading@1', 'document.sentence@1'],
      producer: 'markdown-structural@1', mode: 'closed-world', exclusions: [], verified: true,
      channels: ['body'], method: 'complete-structural-parse'
    }, {
      id: 'coverage:markdown-channels', source: sourceId, revision, scope: 'view:whole',
      types: ['document.line@1', 'document.list-item@1', 'document.quote@1', 'document.code-block@1', 'document.thematic-break@1'],
      producer: 'markdown-structural@1', mode: 'closed-world', exclusions: [], verified: true,
      channels: ['body'], method: 'complete-line-and-block-scan'
    }],
    diagnostics,
    gaps: [
      ...(codeFence ? [{ kind: 'structure', critical: false, reason: 'Unclosed Markdown code fence.', anchor: blocks.at(-1)?.anchor.id }] : []),
      ...(text.includes('\u0000') ? [{ kind: 'unsafe-source', critical: true, reason: 'NUL byte is not accepted in canonical Markdown.' }] : []),
      ...diagnostics.filter((item) => item.severity === 'error').map((item) => ({ ...item, critical: true }))
    ]
  };
}

function sourceDiagnostics(text, options) {
  const diagnostics = [];
  const bidi = text.match(/[\u202A-\u202E\u2066-\u2069]/gu) || [];
  if (bidi.length) diagnostics.push({ kind: 'unicode-bidi-control', count: bidi.length, severity: 'warning' });
  const invisible = text.match(/[\u200B-\u200D\u2060\uFEFF]/gu) || [];
  if (invisible.length) diagnostics.push({ kind: 'suspicious-invisible-character', count: invisible.length, severity: 'warning' });
  const maximumLine = Math.max(0, ...text.split('\n').map((line) => Array.from(line).length));
  const limit = options.maximumLineCodePoints || 100_000;
  if (maximumLine > limit) diagnostics.push({ kind: 'oversized-line', maximumLine, limit, severity: 'error' });
  if (/\b(?:ignore (?:all )?(?:previous|prior) instructions|system prompt|developer message)\b/iu.test(text)) {
    diagnostics.push({ kind: 'embedded-instruction-like-text', severity: 'warning' });
  }
  return diagnostics;
}

function splitSentences(block, sourceText) {
  const points = Array.from(block.text);
  const parts = [];
  let partStart = 0;
  for (let cursor = 0; cursor < points.length; cursor += 1) {
    const point = points[cursor];
    if (!'.!?'.includes(point)) continue;
    const decimalPoint = point === '.' && /\d/u.test(points[cursor - 1] || '')
      && /\d/u.test(points[cursor + 1] || '');
    if (decimalPoint) continue;
    while (cursor + 1 < points.length && '.!?'.includes(points[cursor + 1])) cursor += 1;
    parts.push(points.slice(partStart, cursor + 1).join(''));
    partStart = cursor + 1;
  }
  if (partStart < points.length) parts.push(points.slice(partStart).join(''));
  const result = [];
  let localOffset = 0;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const leading = part.match(/^\s*/u)?.[0] || '';
    const value = part.trim();
    const start = block.anchor.range.start + localOffset + Array.from(leading).length;
    const end = start + Array.from(value).length;
    localOffset += Array.from(part).length;
    if (!value) continue;
    const sentenceAnchor = anchor(
      block.anchor.source,
      block.anchor.revision,
      sourceText,
      start,
      end,
      `${block.id}:s${index + 1}`,
      block.path || []
    );
    result.push({
      id: `observation:${block.id}:s${index + 1}`, type: 'document.sentence@1', status: 'extracted',
      scope: 'view:whole', anchors: [sentenceAnchor.id], support: [sentenceAnchor.id], alternatives: [], confidence: 1,
      payload: { text: value, order: index + 1, parentBlock: block.id },
      embeddedAnchor: sentenceAnchor,
      provenance: { producer: 'markdown-structural@1', source: block.anchor.source }
    });
  }
  return result;
}

export { parseMarkdown, sourceDiagnostics };
