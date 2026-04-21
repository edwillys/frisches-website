import { beforeEach, describe, expect, it, vi } from 'vitest'

const replace = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace }),
}))

import { useLegalPageClose } from '../useLegalPageClose'

describe('useLegalPageClose', () => {
  beforeEach(() => {
    replace.mockReset()
  })

  it('routes all close actions to the home page', async () => {
    const { closeLegalPage } = useLegalPageClose()

    await closeLegalPage()

    expect(replace).toHaveBeenCalledWith('/home')
  })
})
