export const cap = (s: string) =>
  s.length ? s[0].toLocaleUpperCase() + s.slice(1) : "";
