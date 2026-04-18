import { computed } from 'vue'

import { getAboutMembers } from '@/data/aboutMembers'
import { currentAppLocale } from '@/i18n/locale'

export const useAboutMembers = () => computed(() => getAboutMembers(currentAppLocale.value))
