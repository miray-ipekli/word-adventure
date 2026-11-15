import { manifestMember } from '../data/manifest.js'
import { useT } from '../lib/i18n.js'
import sueda from '../assets/manifest/sueda.webp'
import lidya from '../assets/manifest/lidya.webp'
import mina from '../assets/manifest/mina.webp'
import zeynep from '../assets/manifest/zeynep.webp'
import hilal from '../assets/manifest/hilal.webp'
import esin from '../assets/manifest/esin.webp'

const PHOTOS = {
  'mf:sueda': sueda,
  'mf:lidya': lidya,
  'mf:mina': mina,
  'mf:zeynep': zeynep,
  'mf:hilal': hilal,
  'mf:esin': esin,
}

export default function ManifestPhoto({ avatar }) {
  const t = useT()
  const m = manifestMember(avatar)
  if (!m) return null
  return <img className="manifest-photo" src={PHOTOS[avatar]} alt={t('{name} from Manifest', { name: m.name })} draggable="false" />
}
