import { test, expect } from '@playwright/test'

// Test credentials — update these to match a real user in your Supabase instance
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123'

test.describe('Campaign Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByLabel(/correo|email/i).fill(TEST_EMAIL)
    await page.getByLabel(/contraseña|password/i).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /iniciar|login|entrar/i }).click()

    // Wait for redirect to dashboard
    await page.waitForURL('**/campaigns**', { timeout: 10000 })
  })

  test('can create a campaign', async ({ page }) => {
    // Navigate to campaigns
    await page.goto('/campaigns')
    await page.waitForLoadState('networkidle')

    // Click create button
    const createButton = page.getByRole('button', { name: /crearcamp/i })
    await expect(createButton).toBeVisible()
    await createButton.click()

    // Fill in campaign name
    const nameInput = page.getByLabel(/nombre/i)
    await expect(nameInput).toBeVisible()
    await nameInput.fill('Test Campaign E2E')

    // Submit
    const submitButton = page.getByRole('button', { name: /crear camp/i }).last()
    await submitButton.click()

    // Should redirect to campaign detail or show success
    await expect(page).not.toHaveURL('/campaigns', { timeout: 5000 })

    // Verify we're on the detail page
    await expect(page.getByText('Test Campaign E2E')).toBeVisible()
  })

  test('campaigns page loads', async ({ page }) => {
    await page.goto('/campaigns')
    await page.waitForLoadState('networkidle')

    // Should see campaigns page (either empty state or list)
    await expect(page.getByText(/camp/i).first()).toBeVisible()
  })
})
