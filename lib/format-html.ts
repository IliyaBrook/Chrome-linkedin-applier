const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const INLINE_TAGS = new Set([
  'a',
  'abbr',
  'b',
  'bdi',
  'bdo',
  'br',
  'cite',
  'code',
  'data',
  'em',
  'i',
  'kbd',
  'mark',
  'q',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
  'var',
]);

type Token =
  | { kind: 'open'; tag: string; raw: string; selfClose: boolean }
  | { kind: 'close'; tag: string; raw: string }
  | { kind: 'text'; raw: string }
  | { kind: 'comment'; raw: string }
  | { kind: 'doctype'; raw: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    if (input.startsWith('<!--', i)) {
      const end = input.indexOf('-->', i + 4);
      const stop = end === -1 ? input.length : end + 3;
      tokens.push({ kind: 'comment', raw: input.slice(i, stop) });
      i = stop;
      continue;
    }
    if (input.startsWith('<!', i) || input.startsWith('<?', i)) {
      const end = input.indexOf('>', i + 2);
      const stop = end === -1 ? input.length : end + 1;
      tokens.push({ kind: 'doctype', raw: input.slice(i, stop) });
      i = stop;
      continue;
    }
    if (input[i] === '<' && input[i + 1] === '/') {
      const end = input.indexOf('>', i);
      const stop = end === -1 ? input.length : end + 1;
      const raw = input.slice(i, stop);
      const match = raw.match(/^<\/\s*([a-zA-Z][^\s>]*)/);
      tokens.push({ kind: 'close', tag: (match?.[1] ?? '').toLowerCase(), raw });
      i = stop;
      continue;
    }
    if (input[i] === '<') {
      let end = i + 1;
      let inAttr: '"' | "'" | null = null;
      while (end < input.length) {
        const ch = input[end];
        if (inAttr) {
          if (ch === inAttr) inAttr = null;
        } else {
          if (ch === '"' || ch === "'") inAttr = ch;
          else if (ch === '>') break;
        }
        end++;
      }
      const stop = end < input.length ? end + 1 : input.length;
      const raw = input.slice(i, stop);
      const match = raw.match(/^<\s*([a-zA-Z][^\s/>]*)/);
      const tag = (match?.[1] ?? '').toLowerCase();
      const selfClose = raw.endsWith('/>') || VOID_TAGS.has(tag);
      tokens.push({ kind: 'open', tag, raw, selfClose });
      i = stop;
      continue;
    }
    const next = input.indexOf('<', i);
    const stop = next === -1 ? input.length : next;
    tokens.push({ kind: 'text', raw: input.slice(i, stop) });
    i = stop;
  }
  return tokens;
}

export function formatHtml(input: string, indent: string = '  '): string {
  if (!input) return '';
  const tokens = tokenize(input);
  const out: string[] = [];
  let depth = 0;
  const pad = () => indent.repeat(Math.max(0, depth));

  let preserveDepth = 0;

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];

    if (preserveDepth > 0) {
      out.push(t.raw);
      if (t.kind === 'open' && !t.selfClose) preserveDepth++;
      else if (t.kind === 'close') preserveDepth--;
      continue;
    }

    if (t.kind === 'doctype' || t.kind === 'comment') {
      out.push(pad() + t.raw + '\n');
      continue;
    }

    if (t.kind === 'text') {
      const trimmed = t.raw.replace(/\s+/g, ' ').trim();
      if (!trimmed) continue;
      const prev = tokens[idx - 1];
      const next = tokens[idx + 1];
      const prevInline =
        prev && prev.kind === 'open' && INLINE_TAGS.has(prev.tag) && !prev.selfClose;
      const nextInline = next && next.kind === 'close' && INLINE_TAGS.has(next.tag);
      if (prevInline && nextInline) {
        out.push(trimmed);
      } else {
        out.push(pad() + trimmed + '\n');
      }
      continue;
    }

    if (t.kind === 'open') {
      if (t.tag === 'pre' || t.tag === 'textarea' || t.tag === 'script' || t.tag === 'style') {
        out.push(pad() + t.raw);
        if (!t.selfClose) {
          preserveDepth = 1;
        } else {
          out.push('\n');
        }
        continue;
      }
      out.push(pad() + t.raw + '\n');
      if (!t.selfClose) depth++;
      continue;
    }

    if (t.kind === 'close') {
      depth = Math.max(0, depth - 1);
      const last = out[out.length - 1];
      if (last && !last.endsWith('\n')) {
        out.push(t.raw + '\n');
      } else {
        out.push(pad() + t.raw + '\n');
      }
      continue;
    }
  }

  return out.join('').replace(/\n+$/, '');
}
