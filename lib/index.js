// dsh-composer-keys: client-only plugin — host half is a no-op apply().
// Cordis requires a named `apply` export (not `export default`).
function apply() {}

export { apply }
export const name = "composer-keys"
