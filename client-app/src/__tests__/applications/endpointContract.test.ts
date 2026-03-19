import { describe, expect, it } from 'vitest';
import { API_PATHS } from '@/config/api';

describe('API contract', () => {
  it('should use /api/applications endpoint', () => {
    expect(API_PATHS.APPLICATIONS).toBe('/api/applications');
  });
});
