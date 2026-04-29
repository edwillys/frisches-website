import { nextTick, ref, type ComputedRef, type Ref } from 'vue'

import { useUiText } from './useUiText'

export type AboutSubmenuKey = 'story' | 'members' | 'lyrics'

export interface AboutViewExpose {
  goBackOneStep: () => boolean
  navigateToSubmenu: (submenu: AboutSubmenuKey) => void
}

interface UseAboutHeaderMenuOptions {
  currentView: Ref<'logo' | 'cards' | 'content'>
  isAnimating: Ref<boolean>
  isMobileNavMode: Ref<boolean>
  selectedCard: Ref<number | null>
  menuItems: Array<{ route: string }>
  hoveredHeaderIndex: Ref<number | null>
  isAboutActive: ComputedRef<boolean>
  aboutViewRef: Ref<AboutViewExpose | null>
  onNavigateToAbout: (index: number) => void
}

export const useAboutHeaderMenu = (options: UseAboutHeaderMenuOptions) => {
  const t = useUiText()

  const isAboutSubmenuOpenDesktop = ref(false)
  const aboutActiveSubmenu = ref<AboutSubmenuKey>('story')
  const aboutCanGoBack = ref(false)
  const aboutSubmenuItems: AboutSubmenuKey[] = ['story', 'members', 'lyrics']

  const closeSubmenu = () => {
    isAboutSubmenuOpenDesktop.value = false
  }

  const handleAboutStateChange = (payload: {
    activeSubmenu: AboutSubmenuKey
    canGoBack: boolean
  }) => {
    aboutActiveSubmenu.value = payload.activeSubmenu
    aboutCanGoBack.value = payload.canGoBack
  }

  const getAboutSubmenuLabel = (submenu: AboutSubmenuKey): string => {
    if (submenu === 'members') return t.value.about.membersButton
    if (submenu === 'lyrics') return t.value.about.lyricsButton
    return t.value.about.storyButton
  }

  const isAboutMenuRoute = (index: number): boolean => options.menuItems[index]?.route === '/about'

  const getAboutMenuIndex = (): number =>
    options.menuItems.findIndex((item) => item.route === '/about')

  const goToAboutSubmenu = (submenu: AboutSubmenuKey) => {
    const aboutIndex = getAboutMenuIndex()
    if (aboutIndex < 0) return

    if (!options.isAboutActive.value || options.selectedCard.value !== aboutIndex) {
      options.onNavigateToAbout(aboutIndex)
      void nextTick(() => {
        options.aboutViewRef.value?.navigateToSubmenu(submenu)
      })
    } else {
      options.aboutViewRef.value?.navigateToSubmenu(submenu)
    }

    closeSubmenu()
  }

  const toggleAboutSubmenuFromHeader = (index: number) => {
    if (options.isAnimating.value) return
    if (options.currentView.value !== 'content') return
    if (!isAboutMenuRoute(index)) return

    isAboutSubmenuOpenDesktop.value = !isAboutSubmenuOpenDesktop.value
  }

  const onAboutMenuItemFocusout = (event: FocusEvent) => {
    const container = event.currentTarget as HTMLElement
    if (!container.contains(event.relatedTarget as Node | null)) {
      closeSubmenu()
    }
  }

  const handleAboutMenuMouseEnter = (index: number) => {
    options.hoveredHeaderIndex.value = index
    if (options.isMobileNavMode.value) return
    if (options.isAnimating.value) return
    if (options.currentView.value !== 'content') return
    isAboutSubmenuOpenDesktop.value = true
  }

  const handleAboutMenuMouseLeave = () => {
    options.hoveredHeaderIndex.value = null
    if (options.isMobileNavMode.value) return
    closeSubmenu()
  }

  return {
    isAboutSubmenuOpenDesktop,
    aboutActiveSubmenu,
    aboutCanGoBack,
    aboutSubmenuItems,
    closeSubmenu,
    handleAboutStateChange,
    getAboutSubmenuLabel,
    isAboutMenuRoute,
    goToAboutSubmenu,
    toggleAboutSubmenuFromHeader,
    onAboutMenuItemFocusout,
    handleAboutMenuMouseEnter,
    handleAboutMenuMouseLeave,
  }
}
