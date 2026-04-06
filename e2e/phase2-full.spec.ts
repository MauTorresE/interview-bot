import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'mauricio.torres.91@gmail.com'
const TEST_PASSWORD = 'Ma126578!'

const CAMPAIGN_NAME = `E2E Test ${Date.now()}`

async function login(page: import('@playwright/test').Page) {
  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Email').fill(TEST_EMAIL)
  await page.getByLabel('Contraseña').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await page.waitForURL('**/campaigns**', { timeout: 15000 })
}

test.describe.serial('Phase 2: Campaign & Script Builder', () => {

  test('01 — Login and campaigns page loads', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/campaigns/)
    await expect(page.getByText('Campañas').first()).toBeVisible()
  })

  test('02 — Create campaign', async ({ page }) => {
    await login(page)

    // Click create button
    await page.getByRole('button', { name: /crear campaña/i }).click()

    // Fill dialog
    await page.locator('[role="dialog"]').getByLabel(/nombre/i).fill(CAMPAIGN_NAME)

    // Submit
    await page.locator('[role="dialog"]').getByRole('button', { name: /crear campaña/i }).click()

    // Should navigate to detail page
    await page.waitForURL('**/campaigns/**', { timeout: 10000 })

    // Verify campaign name visible
    await expect(page.getByText(CAMPAIGN_NAME)).toBeVisible()
  })

  test('03 — Resumen tab shows campaign info', async ({ page }) => {
    await login(page)
    await page.getByText(CAMPAIGN_NAME).click()
    await page.waitForURL('**/campaigns/**', { timeout: 10000 })

    // Resumen tab should be active by default — look for progress or info card
    await expect(page.getByText(/progreso/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('04 — Guía tab: save research brief', async ({ page }) => {
    await login(page)
    await page.getByText(CAMPAIGN_NAME).click()
    await page.waitForURL('**/campaigns/**', { timeout: 10000 })

    // Click Guía tab
    await page.getByRole('tab', { name: /guía/i }).click()
    await page.waitForTimeout(500)

    // Fill in first textarea (research goals)
    const textareas = page.locator('textarea')
    await textareas.first().fill('Entender la experiencia del usuario con el producto')
    await textareas.nth(1).fill('Frecuencia de uso, satisfacción general')

    // Save
    await page.getByRole('button', { name: /guardar/i }).click()

    // Should show success toast
    await expect(page.getByText(/guía guardada/i)).toBeVisible({ timeout: 5000 })
  })

  test('05 — Guía tab: preview brief', async ({ page }) => {
    await login(page)
    await page.getByText(CAMPAIGN_NAME).click()
    await page.waitForURL('**/campaigns/**', { timeout: 10000 })

    await page.getByRole('tab', { name: /guía/i }).click()
    await page.waitForTimeout(500)

    // Click preview button
    await page.getByRole('button', { name: /vista previa/i }).click()

    // Dialog should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })
  })

  test('06 — Participantes tab: add respondent', async ({ page }) => {
    await login(page)
    await page.getByText(CAMPAIGN_NAME).click()
    await page.waitForURL('**/campaigns/**', { timeout: 10000 })

    // Click Participantes tab
    await page.getByRole('tab', { name: /participantes/i }).click()
    await page.waitForTimeout(500)

    // Click add respondent button
    await page.getByRole('button', { name: /agregar participante/i }).click()

    // Fill dialog
    const dialog = page.locator('[role="dialog"]')
    await dialog.getByLabel(/nombre/i).fill('Participante E2E')
    await dialog.getByLabel(/email/i).fill('e2e@test.com')

    // Submit
    await dialog.getByRole('button', { name: /agregar/i }).click()

    // Should appear in table
    await expect(page.getByText('Participante E2E')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('e2e@test.com')).toBeVisible()
  })

  test('07 — Configuración tab loads', async ({ page }) => {
    await login(page)
    await page.getByText(CAMPAIGN_NAME).click()
    await page.waitForURL('**/campaigns/**', { timeout: 10000 })

    // Click Configuración tab
    await page.getByRole('tab', { name: /configuración/i }).click()
    await page.waitForTimeout(500)

    // Should see config form elements
    await expect(page.getByText(/voz del entrevistador/i)).toBeVisible({ timeout: 5000 })
  })

  test('08 — Consent screen: invalid token shows error', async ({ page }) => {
    await page.goto('/interview/00000000-0000-0000-0000-000000000000')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/no válido/i)).toBeVisible({ timeout: 10000 })
  })

  test('09 — Archive campaign', async ({ page }) => {
    await login(page)
    await page.getByText(CAMPAIGN_NAME).click()
    await page.waitForURL('**/campaigns/**', { timeout: 10000 })

    // Open the actions menu — look for the icon button (MoreHorizontal)
    const menuButton = page.locator('button').filter({ has: page.locator('svg.lucide-more-horizontal, svg.lucide-ellipsis') })
    await menuButton.first().click()

    // Click archive
    await page.getByText(/archivar campaña/i).click()

    // Confirm in alert dialog
    const alertDialog = page.locator('[role="alertdialog"]')
    await expect(alertDialog).toBeVisible({ timeout: 5000 })
    await alertDialog.getByRole('button', { name: /archivar/i }).click()

    // Should redirect to campaigns list
    await page.waitForURL('**/campaigns', { timeout: 10000 })

    // Toast should confirm
    await expect(page.getByText('Campaña archivada')).toBeVisible({ timeout: 5000 })
  })

  test('10 — Spanish accents in navigation', async ({ page }) => {
    await login(page)

    // Sidebar navigation has proper accents
    await expect(page.getByText('Campañas').first()).toBeVisible()
    await expect(page.getByText('Configuración').first()).toBeVisible()
  })
})
