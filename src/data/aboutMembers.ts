import type { AboutMember } from '@/types/aboutMember'
import { getAboutMembersText } from '@/data/aboutMembersText'
import { getTrackById } from '@/data/tracks'
import type { AppLocale } from '@/i18n/locale'

import guitarHeadSvg from '@/assets/badges/guitar-head.svg'
import bassHeadSvg from '@/assets/badges/bass-head.svg'
import microphoneSvg from '@/assets/badges/microphone.svg'
import fluteSvg from '@/assets/badges/flute.svg'
import drumSticksSvg from '@/assets/badges/drum-sticks.svg'
import choirSvg from '@/assets/badges/choir.svg'

// @ts-expect-error - vite-imagetools generates these at build time
import edgarSmall from '@/assets/avatar/edgar.png?w=128&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import edgarMedium from '@/assets/avatar/edgar.png?w=256&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import edgarLarge from '@/assets/avatar/edgar.png?w=384&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import camiSmall from '@/assets/avatar/cami.png?w=128&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import camiMedium from '@/assets/avatar/cami.png?w=256&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import camiLarge from '@/assets/avatar/cami.png?w=384&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import steffSmall from '@/assets/avatar/steff.png?w=128&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import steffMedium from '@/assets/avatar/steff.png?w=256&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import steffLarge from '@/assets/avatar/steff.png?w=384&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import tobiSmall from '@/assets/avatar/tobi.png?w=128&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import tobiMedium from '@/assets/avatar/tobi.png?w=256&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import tobiLarge from '@/assets/avatar/tobi.png?w=384&format=webp&quality=78'

const edgarTrackId = 'tftc:02-tojd'
const camiTrackId = 'tftc:05-witch-hunting'
const steffTrackId = 'tftc:03-etiquette'
const tobiTrackId = 'tftc:01-misled'

const avatarSrcset = (small: string, medium: string, large: string) =>
  `${small} 128w, ${medium} 256w, ${large} 384w`

const createBadges = (titles: readonly string[], images: readonly string[]) =>
  images.flatMap((image, index) => {
    const title = titles[index]
    return title ? [{ title, image }] : []
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
      avatarAlt: memberText.edgar.avatarAlt,
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
      avatarAlt: memberText.cami.avatarAlt,
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
      avatarAlt: memberText.steff.avatarAlt,
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
      avatarAlt: memberText.tobi.avatarAlt,
      badges: createBadges(memberText.tobi.badgeTitles, [bassHeadSvg]),
      descriptionLead: memberText.tobi.descriptionLead,
      descriptionTail: memberText.tobi.descriptionTail,
      favoriteTrackId: tobiTrackId,
      favoriteTrackTitle: getTrackById(tobiTrackId)?.title,
    },
  ]
}
