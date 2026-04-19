export interface GalleryImage {
  id: number
  filename: string
  relativePath: string
  albumName: string
  tags: string[]
  people: string[]
  location: string[]
  rating: number
  creationDate: string | null
  photoCredit: string | null
}

declare module '@/assets/gallery_data.json' {
  const galleryData: GalleryImage[]
  export default galleryData
}
