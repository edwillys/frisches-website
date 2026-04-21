<script setup lang="ts">
import { computed } from 'vue'
import LegalPageFrame from '@/components/LegalPageFrame.vue'
import { useLegalPageClose } from '@/composables/useLegalPageClose'
import { currentAppLocale } from '@/i18n/locale'
import { getLegalText } from '@/i18n/legalText'

const t = computed(() => getLegalText(currentAppLocale.value))
const { closeLegalPage } = useLegalPageClose()
</script>

<template>
  <LegalPageFrame
    :title="t.impressum.title"
    :subtitle="t.impressum.subtitle"
    @close="closeLegalPage"
  >
    <section>
      <h2>{{ t.impressum.contactTitle }}</h2>
      <p>
        {{ t.impressum.contactEmailLabel }}:
        <a href="mailto:frisches.band@gmail.com">frisches.band@gmail.com</a>
      </p>
    </section>

    <section>
      <h2>{{ t.impressum.disclaimerTitle }}</h2>
      <h3>{{ t.impressum.contentLiabilityTitle }}</h3>
      <p>{{ t.impressum.contentLiabilityText }}</p>
      <h3>{{ t.impressum.linksLiabilityTitle }}</h3>
      <p>{{ t.impressum.linksLiabilityText }}</p>
      <h3>{{ t.impressum.copyrightTitle }}</h3>
      <p>{{ t.impressum.copyrightText }}</p>
    </section>
  </LegalPageFrame>
</template>
