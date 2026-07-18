import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

test.describe('cf-openfile end-to-end', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  async function login(page: any, key: string): Promise<void> {
    await page.getByPlaceholder('例如：1234').fill(key)
    await page.getByRole('button', { name: '进入房间' }).click()
  }

  test('rejects invalid room key', async ({ page }) => {
    await login(page, '0000')
    await expect(page.locator('.error')).toContainText('钥匙无效')
    await expect(page).toHaveURL('/')
  })

  test('enters room with valid key', async ({ page }) => {
    await login(page, '1234')
    await expect(page).toHaveURL('/room/1234')
    await expect(page.getByRole('heading', { name: '房间 1234' })).toBeVisible()
  })

  test('uploads file and downloads it', async ({ page }) => {
    const uploadKey = '5678'
    const description = 'E2E upload test'
    const content = 'hello from playwright'

    await login(page, uploadKey)
    await expect(page).toHaveURL(`/room/${uploadKey}`)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'e2e-test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(content),
    })

    await page.getByPlaceholder('文件描述（可选）').fill(description)
    await page.getByRole('button', { name: '开始上传' }).click()

    const fileItem = page.locator('.file-item').filter({ hasText: 'e2e-test.txt' })
    await expect(fileItem).toBeVisible()
    await expect(fileItem.getByText(description)).toBeVisible()

    const downloadButton = fileItem.getByRole('button', { name: '下载' })
    await expect(downloadButton).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadButton.click(),
    ])

    const tempFile = path.join(os.tmpdir(), `cf-openfile-e2e-${Date.now()}.txt`)
    await download.saveAs(tempFile)
    const downloaded = fs.readFileSync(tempFile, 'utf-8')
    fs.unlinkSync(tempFile)

    expect(downloaded).toBe(content)
  })
})
