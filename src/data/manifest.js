// Manifest girl-group avatars. The photos (src/assets/manifest) are head-and-shoulders crops with the
// backdrop removed, so the explorer's chosen color shows behind them.
// The id is what gets saved as the explorer's avatar (the database allows up to 16 characters).

export const MANIFEST_PREFIX = 'mf:'

export const MANIFEST_MEMBERS = [
  { id: 'mf:sueda', name: 'Sueda' },
  { id: 'mf:lidya', name: 'Lidya' },
  { id: 'mf:mina', name: 'Mina' },
  { id: 'mf:zeynep', name: 'Zeynep' },
  { id: 'mf:hilal', name: 'Hilal' },
  { id: 'mf:esin', name: 'Esin' },
]

export const isManifestAvatar = (avatar) => typeof avatar === 'string' && avatar.startsWith(MANIFEST_PREFIX)

export const manifestMember = (avatar) => MANIFEST_MEMBERS.find((m) => m.id === avatar) ?? null
