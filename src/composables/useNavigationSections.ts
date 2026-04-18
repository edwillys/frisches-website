import { computed } from 'vue'

import { currentAppLocale } from '@/i18n/locale'
import { getNavigationSections } from '@/components/cardDealer/menuSections'

export const useNavigationSections = () =>
  computed(() => getNavigationSections(currentAppLocale.value))
