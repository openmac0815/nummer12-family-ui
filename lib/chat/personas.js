const PERSONAS = ["family", "nina", "martin", "olivia", "yuna", "selma"];

function isValidPersona(value) {
  return PERSONAS.includes(String(value || "").trim().toLowerCase());
}

function normalizePersona(value) {
  const candidate = String(value || "").trim().toLowerCase();
  return isValidPersona(candidate) ? candidate : "family";
}

module.exports = {
  PERSONAS,
  isValidPersona,
  normalizePersona
};
