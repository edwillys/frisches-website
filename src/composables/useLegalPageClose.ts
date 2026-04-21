import { useRouter } from 'vue-router'

export const useLegalPageClose = () => {
  const router = useRouter()

  const closeLegalPage = () => {
    const previousRoute = window.history.state?.back

    if (typeof previousRoute === 'string' && previousRoute.startsWith('/')) {
      router.back()
      return
    }

    router.replace('/home')
  }

  return { closeLegalPage }
}
