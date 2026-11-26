/**
 * The framing rules of the app's BLE parser (Brain-matrix-App, src/services/ble/bleParser.ts),
 * restated so the page can re-run them on an example payload:
 *  • notifications are UTF-8 text "EEG,EOG;EEG,EOG;…", ';' (or a line break) separates pairs;
 *  • every segment terminated by ';' is consumed, malformed tokens are counted, never thrown;
 *  • the remainder stays in a carry buffer for the next notification, unless it is already a
 *    complete valid pair (the unterminated last pair), which is flushed at once.
 */
export type Pair = { eeg: number; eog: number };

const NUM = "[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][-+]?\\d+)?";
const PAIR_RE = new RegExp(`^${NUM}\\s*,\\s*${NUM}$`);

function parseToken(token: string): Pair | null {
  const t = token.trim();
  if (t === "" || !PAIR_RE.test(t)) return null;
  const c = t.indexOf(",");
  const eeg = Number(t.slice(0, c));
  const eog = Number(t.slice(c + 1));
  return Number.isFinite(eeg) && Number.isFinite(eog) ? { eeg, eog } : null;
}

export type Step = { chunk: string; joined: string; pairs: Pair[]; carry: string; malformed: number };

/** Feed notifications in order; returns what the parser emitted and kept after each one. */
export function runParser(chunks: string[]): Step[] {
  let carry = "";
  return chunks.map((chunk) => {
    const joined = carry + chunk.replace(/\r\n|\r|\n/g, ";");
    carry = joined;
    const pairs: Pair[] = [];
    let malformed = 0;
    const lastSemi = carry.lastIndexOf(";");
    if (lastSemi !== -1) {
      const consumable = carry.slice(0, lastSemi + 1);
      carry = carry.slice(lastSemi + 1);
      for (const raw of consumable.split(";")) {
        if (raw.trim() === "") continue;
        const p = parseToken(raw);
        if (p) pairs.push(p);
        else malformed++;
      }
    }
    if (carry !== "") {
      const tail = parseToken(carry);
      if (tail) {
        pairs.push(tail);
        carry = "";
      }
    }
    return { chunk, joined, pairs, carry, malformed };
  });
}
