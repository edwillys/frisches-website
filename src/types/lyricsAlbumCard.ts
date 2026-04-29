export interface LyricsAlbumTrack {
  trackId: string
  title: string
  lyricsPath: string
  credits: string
}

export interface LyricsAlbumCard {
  albumId: string
  albumTitle: string
  coverSrcset?: string
  coverUrl: string
  themeColor: string
  themeColorDark: string
  tracks: LyricsAlbumTrack[]
}
