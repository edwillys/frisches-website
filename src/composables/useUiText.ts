import { computed } from 'vue'

import { currentAppLocale } from '@/i18n/locale'
import { getUiText } from '@/i18n/uiText'

export const useUiText = () => computed(() => getUiText(currentAppLocale.value))
