import { createKey } from './key';

describe('createKey typeguard', () => {
  it('should typecheck', () => {
    const keyString = '@Test/Foo';
    const key = createKey(keyString);

    expectTypeOf<typeof key>().toEqualTypeOf<typeof keyString>();
    expect(key).toBe(keyString);
  });
  it('should fail on incorrect key', () => {
    const keyString = '@Test/123';
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error wrong key
    const key = createKey(keyString);

    expectTypeOf<
      typeof key
    >().toEqualTypeOf<'Error: use @Component/Name format'>();

    // error should be contained and failty key returned
    expect(key).toBe(keyString);
  });
});
