export async function* asyncRange(start: number, end: number, delayMs = 50) {
  for (let i = start; i <= end; i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    yield i;
  }
}
