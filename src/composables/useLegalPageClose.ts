import { useRouter } from 'vue-router'

export const useLegalPageClose = () => {
  const router = useRouter()

  const closeLegalPage = () => router.replace('/home')

  return { closeLegalPage }
}
