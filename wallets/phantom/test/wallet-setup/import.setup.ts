import type { BrowserContext, Page } from '@playwright/test'
import { defineWalletSetup } from '@synthetixio/synpress-cache'
import { PhantomWallet } from '../../src'
import { getExtensionId } from '../../src/fixtureActions'

const PASSWORD = 'Test1234'

const importPhantomWallet = defineWalletSetup(PASSWORD, async (context: BrowserContext, phantomPage: Page) => {
  const extensionId = await getExtensionId(context, 'phantom')
  const phantom = new PhantomWallet(phantomPage, context, PASSWORD, extensionId)

  try {
    await phantom.importWallet({ secretWords: '', password: PASSWORD })
  } catch (e) {
    console.log('Error creating Keplr wallet:', e)
  }
})

export default importPhantomWallet
