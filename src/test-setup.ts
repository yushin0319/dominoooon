import '@testing-library/jest-dom';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

// jest-dom のマッチャー型を vitest 5 の Assertion に載せるための型拡張。
// - 上の import が付ける型は global の jest.Matchers 拡張だが、vitest 5 は
//   jest.Matchers を読まなくなった（vitest 5 移行ガイド）
// - jest-dom 7.0.1 の '/vitest' エントリは vitest 4 の Assertion<T> を拡張しており、
//   vitest 5 の Assertion<R, T> と型パラメータが合わない（TS2428。skipLibCheck で隠れ、
//   マッチャーの戻り値が void ではなく受け取った値の型になる。testing-library/jest-dom#738）
// そのため vitest 5 の公式拡張ポイント Matchers<R, T> を直接拡張する。
// .d.ts に置くと skipLibCheck で拡張の不整合が隠れるため、型チェック対象の .ts に置く。
declare module 'vitest' {
  interface Matchers<R, T> extends TestingLibraryMatchers<unknown, R> {}
}
