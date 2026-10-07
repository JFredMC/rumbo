/** mulberry32: PRNG pequeño y determinista. Devuelve el valor y la semilla siguiente. */
export function nextRandom(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Envoltorio mutable para usar dentro de un paso de simulación. */
export class Rng {
  constructor(public seed: number) {}
  next(): number {
    const [v, s] = nextRandom(this.seed);
    this.seed = s;
    return v;
  }
  between(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }
}
