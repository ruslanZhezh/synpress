import path from 'node:path'
import { type Page, chromium } from '@playwright/test'

import { test as base } from '@playwright/test'
import { KeplrWallet } from '../KeplrWallet'
import { PASSWORD, SEED_PHRASE } from '../utils'
import {
  CACHE_DIR_NAME,
  createTempContextDir,
  defineWalletSetup,
  removeTempContextDir
} from '@synthetixio/synpress-utils'
import fs from 'fs-extra'
import { persistLocalStorage } from '../fixtureActions/persistLocalStorage'
import { getExtensionId } from '../fixtureActions'
//import unlockForFixtures from '../fixtureActions/unlockForFixtures'
import { prepareExtension } from '@synthetixio/synpress-utils'

type KeplrFixtures = {
  _contextPath: string
  keplr: KeplrWallet
  keplrPage: Page
  extensionId: string
}

let _keplrPage: Page

export const keplrFixtures = (walletSetup: ReturnType<typeof defineWalletSetup>, slowMo = 0) => {
  const cacheDirPath = path.join(process.cwd(), CACHE_DIR_NAME, walletSetup.hash)
  console.log(cacheDirPath, 'ee')
  return base.extend<KeplrFixtures>({
    _contextPath: async ({ browserName }, use, testInfo) => {
      const contextDir = await createTempContextDir(browserName, testInfo.testId)
      await use(contextDir)
      await removeTempContextDir(contextDir)
    },
    context: async ({ context: currentContext, _contextPath }, use) => {
      const cacheDirPath = path.join(process.cwd(), CACHE_DIR_NAME, walletSetup.hash)
      if (!(await fs.exists(cacheDirPath))) {
        throw new Error(`Cache for ${cacheDirPath} does not exist. Create it first!`)
      }

      // Copying the cache to the temporary context directory.
      await fs.copy(cacheDirPath, _contextPath)

      const keplrPath = await prepareExtension('Keplr')
      // We don't need the `--load-extension` arg since the extension is already loaded in the cache.
      const browserArgs = [`--disable-extensions-except=${keplrPath}`]
      if (process.env.HEADLESS) {
        browserArgs.push('--headless=new')

        if (slowMo) {
          console.warn('[WARNING] Slow motion makes no sense in headless mode. It will be ignored!')
        }
      }

      const context = await chromium.launchPersistentContext(_contextPath, {
        headless: false,
        args: browserArgs,
        slowMo: process.env.HEADLESS ? 0 : 1000,
      })

      const { cookies, origins } = await currentContext.storageState()
      if (cookies) {
        await context.addCookies(cookies)
      }
      if (origins && origins.length > 0) {
        await persistLocalStorage(origins, context)
      }
      const extensionId = await getExtensionId(context, 'keplr')
      _keplrPage = context.pages()[0] as Page
      await _keplrPage.goto('chrome-extension://' + extensionId + '/register.html')
      await use(context)
      await context.close()
    },
    page: async ({ context }, use) => {
      const page = await context.newPage()
      await use(page)
    },
    keplrPage: async ({ context: _ }, use) => {
      await use(_keplrPage!);
    },
    keplr: async ({ context }, use) => {
      const extensionId = await getExtensionId(context, 'keplr')
      const keplrWallet = new KeplrWallet(_keplrPage, context, extensionId, PASSWORD)

      await keplrWallet.setupWallet({ secretWordsOrPrivateKey: SEED_PHRASE, password: PASSWORD })
      await use(keplrWallet)
    },
  })
}