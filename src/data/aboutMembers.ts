import type { AboutMember } from '@/types/aboutMember'
import { getAboutMembersText } from '@/data/aboutMembersText'
import { getTrackById } from '@/data/tracks'
import type { AppLocale } from '@/i18n/locale'

import guitarHeadSvg from '@/assets/badges/guitar-head.svg?raw'
import bassHeadSvg from '@/assets/badges/bass-head.svg?raw'
import microphoneSvg from '@/assets/badges/microphone.svg?raw'
import fluteSvg from '@/assets/badges/flute.svg?raw'
import drumSticksSvg from '@/assets/badges/drum-sticks.svg?raw'
import choirSvg from '@/assets/badges/choir.svg?raw'

// @ts-expect-error - vite-imagetools generates these at build time
import edgarSmall from '@/assets/private/avatar/edgar.png?w=128&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import edgarMedium from '@/assets/private/avatar/edgar.png?w=256&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import edgarLarge from '@/assets/private/avatar/edgar.png?w=384&format=webp&quality=78'

// Ordered animation frames – each file is processed by vite-imagetools (512px WebP, alpha
// preserved) so they get the same compression pipeline as the static avatars.
// The glob key order matches alphabetical/numeric order (frame002, frame003…frame010).
// NOTE: import.meta.glob patterns must be static literals (Vite build-time constraint),
// so each member keeps its own glob call. This helper handles the shared transformation.
const resolveFlipFrames = (
  modules: Record<string, string | undefined>,
  fallback: string
): { frames: string[]; avatarBack: string } => {
  const frames = Object.keys(modules)
    .sort()
    .flatMap((key) => {
      const url = modules[key]
      return url ? [url] : []
    })
  return { frames, avatarBack: frames.at(-1) ?? fallback }
}

const edgarFrameModules = import.meta.glob<string>(
  '../assets/private/avatar/poses/edgar/edgar-frame*.png',
  { eager: true, query: { w: '512', format: 'webp', quality: '78' }, import: 'default' }
)
const { frames: edgarFlipFrames, avatarBack: edgarAvatarBack } = resolveFlipFrames(
  edgarFrameModules,
  edgarMedium
)

// @ts-expect-error - vite-imagetools generates these at build time
import camiSmall from '@/assets/private/avatar/cami.png?w=128&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import camiMedium from '@/assets/private/avatar/cami.png?w=256&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import camiLarge from '@/assets/private/avatar/cami.png?w=384&format=webp&quality=78'

const camiFrameModules = import.meta.glob<string>(
  '../assets/private/avatar/poses/cami/cami-frame*.png',
  { eager: true, query: { w: '512', format: 'webp', quality: '78' }, import: 'default' }
)
const { frames: camiFlipFrames, avatarBack: camiAvatarBack } = resolveFlipFrames(
  camiFrameModules,
  camiMedium
)
// @ts-expect-error - vite-imagetools generates these at build time
import steffSmall from '@/assets/private/avatar/steff.png?w=128&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import steffMedium from '@/assets/private/avatar/steff.png?w=256&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import steffLarge from '@/assets/private/avatar/steff.png?w=384&format=webp&quality=78'

const steffFrameModules = import.meta.glob<string>(
  '../assets/private/avatar/poses/steff/steff-frame*.png',
  { eager: true, query: { w: '512', format: 'webp', quality: '78' }, import: 'default' }
)
const { frames: steffFlipFrames, avatarBack: steffAvatarBack } = resolveFlipFrames(
  steffFrameModules,
  steffMedium
)
// @ts-expect-error - vite-imagetools generates these at build time
import tobiSmall from '@/assets/private/avatar/tobi.png?w=128&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import tobiMedium from '@/assets/private/avatar/tobi.png?w=256&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import tobiLarge from '@/assets/private/avatar/tobi.png?w=384&format=webp&quality=78'

const tobiFrameModules = import.meta.glob<string>(
  '../assets/private/avatar/poses/tobi/tobi-frame*.png',
  { eager: true, query: { w: '512', format: 'webp', quality: '78' }, import: 'default' }
)
const { frames: tobiFlipFrames, avatarBack: tobiAvatarBack } = resolveFlipFrames(
  tobiFrameModules,
  tobiMedium
)

const edgarTrackId = 'tftc:02-tojd'
const camiTrackId = 'tftc:04-mr-red-jacket'
const steffTrackId = 'tftc:03-etiquette'

const avatarSrcset = (small: string, medium: string, large: string) =>
  `${small} 128w, ${medium} 256w, ${large} 384w`

const createBadges = (titles: readonly string[], images: readonly string[]) =>
  images.flatMap((svg, index) => {
    const title = titles[index]
    return title ? [{ title, svg }] : []
  })

export const getAboutMembers = (locale: AppLocale): AboutMember[] => {
  const memberText = getAboutMembersText(locale)

  return [
    {
      id: 'edgar',
      name: memberText.edgar.name,
      initial: 'E',
      avatar: edgarMedium,
      avatarSrcset: avatarSrcset(edgarSmall, edgarMedium, edgarLarge),
      avatarBack: edgarAvatarBack,
      flipFrames: edgarFlipFrames,
      flipFps: 8,
      badges: createBadges(memberText.edgar.badgeTitles, [guitarHeadSvg, choirSvg]),
      descriptionLead: memberText.edgar.descriptionLead,
      descriptionTail: memberText.edgar.descriptionTail,
      favoriteTrackId: edgarTrackId,
      favoriteTrackTitle: getTrackById(edgarTrackId)?.title,
    },
    {
      id: 'cami',
      name: memberText.cami.name,
      initial: 'C',
      avatar: camiMedium,
      avatarSrcset: avatarSrcset(camiSmall, camiMedium, camiLarge),
      avatarBack: camiAvatarBack,
      flipFrames: camiFlipFrames,
      flipFps: 8,
      badges: createBadges(memberText.cami.badgeTitles, [microphoneSvg, fluteSvg]),
      descriptionLead: memberText.cami.descriptionLead,
      descriptionTail: memberText.cami.descriptionTail,
      favoriteTrackId: camiTrackId,
      favoriteTrackTitle: getTrackById(camiTrackId)?.title,
    },
    {
      id: 'steff',
      name: memberText.steff.name,
      initial: 'S',
      avatar: steffMedium,
      avatarSrcset: avatarSrcset(steffSmall, steffMedium, steffLarge),
      avatarBack: steffAvatarBack,
      flipFrames: steffFlipFrames,
      flipFps: 8,
      badges: createBadges(memberText.steff.badgeTitles, [drumSticksSvg]),
      descriptionLead: memberText.steff.descriptionLead,
      descriptionTail: memberText.steff.descriptionTail,
      favoriteTrackId: steffTrackId,
      favoriteTrackTitle: getTrackById(steffTrackId)?.title,
    },
    {
      id: 'tobi',
      name: memberText.tobi.name,
      initial: 'T',
      avatar: tobiMedium,
      avatarSrcset: avatarSrcset(tobiSmall, tobiMedium, tobiLarge),
      avatarBack: tobiAvatarBack,
      flipFrames: tobiFlipFrames,
      flipFps: 8,
      badges: createBadges(memberText.tobi.badgeTitles, [bassHeadSvg]),
      descriptionLead: memberText.tobi.descriptionLead,
      descriptionTail: memberText.tobi.descriptionTail,
    },
  ]
}
