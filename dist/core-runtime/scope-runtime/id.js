const ID_PAD = 3;
export function makeId(prefix, seq) {
    return `${prefix}${String(seq).padStart(ID_PAD, "0")}`;
}
