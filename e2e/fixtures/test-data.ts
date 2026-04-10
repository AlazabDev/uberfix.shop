/**
 * Test data for E2E tests
 * بيانات الاختبار للـ E2E tests
 * 
 * IMPORTANT: Credentials are loaded from environment variables.
 * Set TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, etc. in your CI/CD environment.
 */

export const testUsers = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || '',
    password: process.env.TEST_ADMIN_PASSWORD || '',
    role: 'admin',
  },
  vendor: {
    email: process.env.TEST_VENDOR_EMAIL || '',
    password: process.env.TEST_VENDOR_PASSWORD || '',
    role: 'vendor',
  },
  customer: {
    email: process.env.TEST_CUSTOMER_EMAIL || '',
    password: process.env.TEST_CUSTOMER_PASSWORD || '',
    role: 'customer',
  },
};

export const testRequest = {
  title: 'Test Maintenance Request',
  description: 'This is a test maintenance request for E2E testing',
  priority: 'high',
  category: 'plumbing',
};

export const testProperty = {
  name: 'Test Building A',
  address: '123 Test Street, Cairo, Egypt',
  type: 'commercial',
};
