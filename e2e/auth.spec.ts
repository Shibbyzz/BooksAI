import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login')

    // Check if login form elements are present
    await expect(
      page.getByRole('heading', { name: /sign in to your account/i })
    ).toBeVisible()
    await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible()
    await expect(page.getByPlaceholder(/enter your password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('should show signup page', async ({ page }) => {
    await page.goto('/signup')

    // Check if signup form elements are present
    await expect(
      page.getByRole('heading', { name: /create your account/i })
    ).toBeVisible()
    await expect(page.getByPlaceholder(/enter your full name/i)).toBeVisible()
    await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible()
    await expect(page.getByPlaceholder(/create a password/i)).toBeVisible()
    await expect(
      page.getByRole('button', { name: /create account/i })
    ).toBeVisible()
  })

  test('should navigate between login and signup', async ({ page }) => {
    await page.goto('/login')

    // Navigate to signup
    await page.getByRole('link', { name: /create a new account/i }).click()
    await expect(page).toHaveURL('/signup')

    // Navigate back to login
    await page
      .getByRole('link', { name: /sign in to your existing account/i })
      .click()
    await expect(page).toHaveURL('/login')
  })

  test('should show hero page when not authenticated', async ({ page }) => {
    await page.goto('/')

    // Check if hero content is visible
    await expect(
      page.getByRole('heading', { name: /modern full-stack/i })
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /get started/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /learn more/i })).toBeVisible()
  })

  test('should validate form inputs', async ({ page }) => {
    await page.goto('/login')

    // Try to submit empty form
    await page.getByRole('button', { name: /sign in/i }).click()

    // Check HTML5 validation messages
    const emailInput = page.getByPlaceholder(/enter your email/i)
    const passwordInput = page.getByPlaceholder(/enter your password/i)

    await expect(emailInput).toBeInvalid()
    await expect(passwordInput).toBeInvalid()
  })

  test('should handle invalid login credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill in invalid credentials
    await page.getByPlaceholder(/enter your email/i).fill('invalid@test.com')
    await page.getByPlaceholder(/enter your password/i).fill('wrongpassword')

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should remain on login page (since we don't have real auth)
    await expect(page).toHaveURL('/login')
  })
})
