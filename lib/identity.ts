/**
 * Deterministic, friendly handle derived from a Sui address.
 *
 * Picks one of 16 short brand-adjacent words seeded by the first hex nibble,
 * then appends the next 4 hex chars as a stable suffix:
 *
 *   0x17c7eff1...  ->  pen-17c7
 *   0x5e6f7a8b...  ->  ash-5e6f
 *
 * Used in featured-creators and the profile page so the same address always
 * surfaces as the same handle.
 */
const HANDLE_WORDS = [
  "ash",
  "pen",
  "ink",
  "fern",
  "mint",
  "oak",
  "sage",
  "rune",
  "wave",
  "drift",
  "ember",
  "slate",
  "moss",
  "lark",
  "rose",
  "iris",
] as const;

export function deriveHandle(address: string | undefined | null): string {
  if (!address || !address.startsWith("0x") || address.length < 7) {
    return "anon";
  }
  const nibble = parseInt(address[2], 16);
  const word = HANDLE_WORDS[nibble % HANDLE_WORDS.length];
  return `${word}-${address.slice(3, 7)}`;
}

export function handleInitial(address: string | undefined | null): string {
  return deriveHandle(address).charAt(0).toUpperCase();
}
