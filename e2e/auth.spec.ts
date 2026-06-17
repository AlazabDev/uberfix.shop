import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

/**
 * E2E Tests: Authentication Flow
 * اختبارات رحلة تسجيل الدخول والخروج
 */
test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  const hasAdminCredentials = Boolean(testUsers.admin.email && testUsers.admin.password);

  test('should display login page correctly', async ({ page }) => {
    await page.click('text=تسجيل الدخول');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h1')).toContainText('تسجيل الدخول');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    test.skip(!hasAdminCredentials, 'Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run credential login E2E.');

    await page.goto('/login');
    const authFailures: string[] = [];
    page.on('response', async (response) => {
      if (response.url().includes('/auth/v1/') && response.status() >= 400) {
        authFailures.push(`${response.status()} ${response.url()}`);
      }
    });
    
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    
    // Wait for authenticated app route without getting stuck in auth callback/role confirmation loops.
    await page.waitForURL(/\/(dashboard|technicians\/dashboard)(\?.*)?$/, { timeout: 15000 });
    await expect(page).not.toHaveURL(/\/auth\/(callback|confirm-role)/);
    expect(authFailures).toEqual([]);
    
    // Verify successful login
    await expect(page.locator('text=لوحة التحكم')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');
    
    // Check for error message
    await expect(page.locator('text=/خطأ|فشل|غير صحيح/i')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=نسيت كلمة المرور');
    
    await expect(page).toHaveURL(/.*forgot-password/);
  });

  test('should logout successfully', async ({ page }) => {
    test.skip(!hasAdminCredentials, 'Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run logout E2E.');

    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/(dashboard|technicians\/dashboard)(\?.*)?$/, { timeout: 15000 });
    
    // Click user menu
    await page.click('[data-testid="user-menu"], .avatar, [aria-label*="user"]');
    
    // Click logout
    await page.click('text=تسجيل الخروج');
    
    // Verify redirect to home/login
    await expect(page).toHaveURL(/\/(login)?$/);
  });

  test('should protect dashboard and redirect anonymous users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h1')).toContainText('تسجيل الدخول');
  });

  test('should not falsely authenticate an empty OAuth callback', async ({ page }) => {
    await page.goto('/auth/callback');
    await expect(page.locator('text=لم يتم العثور على معلومات المصادقة')).toBeVisible({ timeout: 17000 });
    await expect(page).not.toHaveURL(/\/dashboard/);
  });
});
