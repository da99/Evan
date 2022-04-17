
export const WHITESPACE_PATTERN = /\s+/

function trim(x: string) {
  return x.trim();
} // function

function length_not_zero(x: String | Array<any>) {
  return x.length != 0;
} // function

export function squeeze_whitespace(s: string) {
  return s.trim().replaceAll(WHITESPACE_PATTERN, ' ');
} // function

export function split_lines(s: string) {
  return s.trim().split('\n');
} // export function

export function split_whitespace(x: string) {
  // The .split method call will not create any null values in the
  // returned array. So no need to filter out null values.
  // We just need to filter out empty strings.
  return x
  .trim()
  .split(WHITESPACE_PATTERN)
  .map(trim)
  .filter(length_not_zero);
} // function

export function compact_lines(x: string, n: number) : string {
  return x.replaceAll(new RegExp(`\\n{${n},}`, "g"), "\n");
} // function

// Adds lines of b into a, only if characters other than whitespace
//   are different.
//   " a " + "a" = " a "
export function split_join(str: string, join?: string) {
  return split_whitespace(str).join(join || " ");
} // function

export function each_block(body: string, raw_begin: string, raw_end: string, f?: (x: string) => void) {
  const begin = split_whitespace(raw_begin);
  const end = split_whitespace(raw_end);
  const join = "\\s+";
  const reg = new RegExp(`${begin.join(join)}\\s+(.+?)\\s+${end.join(join)}`, "gms");
  const results = body.matchAll(reg);
  const match_pairs = [...results];

  const matches: string[] = [];
  for (const [block, inner] of match_pairs) {
    matches.push(inner);
    f && f(inner);
  }

  return matches;
} // function

export function insert_after_line_contains(new_s: string, needle: string, haystack: string) {
  const lines = haystack.split('\n').reverse();
  const new_lines: string[] = [];
  let found = false;
  for (const l of lines) {
    if (!found && l.includes(needle)) {
      new_lines.push(new_s);
      found = true;
    }
    new_lines.push(l);
  } // for
  return new_lines.reverse().join('\n');
} // export

export function string_to_array(x: string | string[]) {
  if (Array.isArray(x))
    return x;
  return split_whitespace(x);
} // export function

export function flatten_cmd(args: Array<string | string[]>) {
  return args.reduce((prev: string[], curr: string | string[]) => {
    if (typeof curr === "string") {
      return prev.concat(split_whitespace(curr));
    } else {
      return prev.concat(curr);
    }
  }, [] as string[]);
} // export function


