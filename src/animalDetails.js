//derive a stable public label from the permanent database id
export function publicAnimalId(id) {
  return `PET-${String(id).padStart(4, "0")}`;
}

export function formatAge(age) {
  if (age === null || age === undefined || age === "") return "Not recorded";
  if (Number(age) === 0) return "Under 1 year";
  return `${age} ${Number(age) === 1 ? "year" : "years"}`;
}
