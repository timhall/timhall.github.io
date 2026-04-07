export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str, length) {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, "-");
}
