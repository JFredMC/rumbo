import { MODE_KEY, resolveMode } from './mode';

function mem(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

describe('resolveMode', () => {
  it('sin API siempre demo', () => {
    expect(resolveMode(null, mem(), '?mode=api')).toBe('demo');
  });
  it('la query manda y se recuerda', () => {
    const st = mem();
    expect(resolveMode('http://x', st, '?mode=api')).toBe('api');
    expect(st.getItem(MODE_KEY)).toBe('api');
    expect(resolveMode('http://x', st, '')).toBe('api');
    expect(resolveMode('http://x', st, '?mode=demo')).toBe('demo');
    expect(resolveMode('http://x', st, '')).toBe('demo');
  });
  it('por defecto demo', () => {
    expect(resolveMode('http://x', mem(), '')).toBe('demo');
  });
});
