export const capitalize = (s: string) => {
    if (s.length) {
        return s[0].toLocaleUpperCase().concat(s.slice(1));
    }
    return s;
}