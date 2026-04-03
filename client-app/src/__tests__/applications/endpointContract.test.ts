describe('endpoint contract constants', () => {
  it('uses otp endpoints under /api/auth/otp/*', () => {
    expect('/api/auth/otp/start').toBe('/api/auth/otp/start');
    expect('/api/auth/otp/verify').toBe('/api/auth/otp/verify');
  });
});
