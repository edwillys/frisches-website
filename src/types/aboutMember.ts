export interface AboutMemberBadge {
  title: string
  svg: string
}

export interface AboutMember {
  id: string
  name: string
  initial: string
  avatar: string
  avatarSrcset: string
  badges: AboutMemberBadge[]
  descriptionLead: string
  descriptionTail?: string
  favoriteTrackId?: string
  favoriteTrackTitle?: string
  flipFrames?: string[]
  flipFps?: number
  hoverPoseFrame?: number
  avatarBack?: string
  avatarBackSrcset?: string
}
