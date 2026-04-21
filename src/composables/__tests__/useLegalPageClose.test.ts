import { beforeEach, describe, expect, it, vi } from 'vitest'

const back = vi.fn()
const replace = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ back, replace }),
}))

import { useLegalPageClose } from '../useLegalPageClose'

describe('useLegalPageClose', () => {
  beforeEach(() => {
    back.mockReset()
    replace.mockReset()
    window.history.replaceState({}, '')
  })

  it('goes back to the previous route when one exists', async () => {
    window.history.replaceState({ back: '/gallery' }, '')

    const { closeLegalPage } = useLegalPageClose()

    await closeLegalPage()

    expect(back).toHaveBeenCalledTimes(1)
    expect(replace).not.toHaveBeenCalled()
  })

  it('falls back to the home page when there is no previous route', async () => {
    const { closeLegalPage } = useLegalPageClose()

    await closeLegalPage()

    expect(back).not.toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith('/home')
  })
})
