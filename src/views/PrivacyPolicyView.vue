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
  <LegalPageFrame :title="t.privacy.title" :subtitle="t.privacy.subtitle" @close="closeLegalPage">
    <section>
      <h2>{{ t.privacy.s1Title }}</h2>
      <p>
        {{ t.privacy.s1ContactLabel }}:
        <a href="mailto:frisches.band@gmail.com">frisches.band@gmail.com</a>
      </p>
    </section>

    <section>
      <h2>{{ t.privacy.s2Title }}</h2>
      <p>{{ t.privacy.s2Intro }}</p>
      <ul>
        <li>{{ t.privacy.s2Item1 }}</li>
        <li>{{ t.privacy.s2Item2 }}</li>
        <li>{{ t.privacy.s2Item3 }}</li>
        <li>{{ t.privacy.s2Item4 }}</li>
        <li>{{ t.privacy.s2Item5 }}</li>
      </ul>
      <p>{{ t.privacy.s2Outro }}</p>
    </section>

    <section>
      <h2>{{ t.privacy.s3Title }}</h2>
      <p>{{ t.privacy.s3Text }}</p>
    </section>

    <section>
      <h2>{{ t.privacy.s4Title }}</h2>
      <p>{{ t.privacy.s4Text1 }}</p>
      <p>
        {{ t.privacy.s4Text2 }}
        <a
          href="https://www.cloudflare.com/privacypolicy/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cloudflare Privacy Policy
        </a>
        .
      </p>
    </section>

    <section>
      <h2>{{ t.privacy.s5Title }}</h2>
      <p>{{ t.privacy.s5Text }}</p>
    </section>

    <section>
      <h2>{{ t.privacy.s6Title }}</h2>
      <p>{{ t.privacy.s6Intro }}</p>
      <ul>
        <li>{{ t.privacy.s6Right1 }}</li>
        <li>{{ t.privacy.s6Right2 }}</li>
        <li>{{ t.privacy.s6Right3 }}</li>
        <li>{{ t.privacy.s6Right4 }}</li>
        <li>{{ t.privacy.s6Right5 }}</li>
        <li>{{ t.privacy.s6Right6 }}</li>
      </ul>
      <p>
        {{ t.privacy.s6ContactText }}
        <a href="mailto:frisches.band@gmail.com">frisches.band@gmail.com</a>
      </p>
      <p>
        {{ t.privacy.s6AuthorityText }}
        <a href="https://www.lda.bayern.de" target="_blank" rel="noopener noreferrer">{{
          t.privacy.s6AuthorityName
        }}</a>
        .
      </p>
    </section>

    <section>
      <h2>{{ t.privacy.s7Title }}</h2>
      <p>{{ t.privacy.s7Text }}</p>
    </section>
  </LegalPageFrame>
</template>
