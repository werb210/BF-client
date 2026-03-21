import { describe, expect, it } from 'vitest';
import { API_ENDPOINTS } from '@/api/endpoints';

describe('API contract', () => {
  it('should use /api/applications endpoint', () => {
    expect(API_ENDPOINTS.APPLICATIONS).toBe('/applications');
  });
});
