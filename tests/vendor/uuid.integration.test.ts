describe('uuid', () => {
  it('should return the same id for the same input', async () => {
    const { v5 } = await import('uuid');
    const id1 = v5('test-input', '6ba7b810-9dad-11d1-80b4-00c04fd430c8');
    const id2 = v5('test-input', '6ba7b810-9dad-11d1-80b4-00c04fd430c8');
    expect(id1).toBe(id2);
  });
})