import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import LegalPageFrame from '../LegalPageFrame.vue'
import { setCurrentAppLocale } from '@/i18n/locale'

describe('LegalPageFrame', () => {
  afterEach(() => {
    setCurrentAppLocale('en')
    document.body.innerHTML = ''
  })

  it('emits close when clicking the backdrop', async () => {
    const wrapper = mount(LegalPageFrame, {
      attachTo: document.body,
      props: {
        title: 'Impressum',
        subtitle: 'Angaben gemaess § 5 TMG',
      },
      slots: {
        default: '<section><p>Content</p></section>',
      },
    })

    await wrapper.trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)

    wrapper.unmount()
  })

  it('does not emit close when clicking inside the content area', async () => {
    const wrapper = mount(LegalPageFrame, {
      attachTo: document.body,
      props: {
        title: 'Privacy Policy',
        subtitle: 'April 2025',
      },
      slots: {
        default: '<section><p>Content</p></section>',
      },
    })

    await wrapper.find('.legal-page__container').trigger('click')

    expect(wrapper.emitted('close')).toBeUndefined()

    wrapper.unmount()
  })

  it('emits close when escape is pressed', async () => {
    const wrapper = mount(LegalPageFrame, {
      attachTo: document.body,
      props: {
        title: 'Legal Notice',
        subtitle: 'Subtitle',
      },
      slots: {
        default: '<section><p>Content</p></section>',
      },
    })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('close')).toHaveLength(1)

    wrapper.unmount()
  })
})
