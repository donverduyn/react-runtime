import type { Split } from 'type-fest';

export type ExpectFalse<T extends false> = T;
export type Expect<T extends true> = T;

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
/* eslint-disable prettier/prettier */
type Alpha =
  | 'a'|'b'|'c'|'d'|'e'|'f'|'g'|'h'|'i'|'j'|'k'|'l'|'m'
  | 'n'|'o'|'p'|'q'|'r'|'s'|'t'|'u'|'v'|'w'|'x'|'y'|'z'
  | 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'J'|'K'|'L'|'M'
  | 'N'|'O'|'P'|'Q'|'R'|'S'|'T'|'U'|'V'|'W'|'X'|'Y'|'Z';
/* eslint-enable prettier/prettier */
type AllowedChar = Alpha | Digit | '_' | '$';

export const createKey = <T extends string>(
  key: IsValid<T> extends true ? T : 'Error: use @Component/Name format'
) => key;

type ValidSegment<
  S extends string,
  FirstChar extends boolean = true,
> = S extends `${infer First}${infer Rest}`
  ? FirstChar extends true
    ? First extends Digit
      ? false // first char cannot be digit
      : First extends Alpha
        ? ValidSegment<Rest, false>
        : false
    : First extends AllowedChar
      ? ValidSegment<Rest, false>
      : false
  : true;

type FirstIsValid<S extends string> = S extends `@${infer Rest}`
  ? Rest extends ''
    ? false
    : ValidSegment<Rest>
  : false;

type ValidateRest<T extends string[]> = T extends [
  infer Segment extends string,
  ...infer Rest extends string[],
]
  ? Segment extends ''
    ? false
    : ValidSegment<Segment> extends true
      ? ValidateRest<Rest>
      : false
  : true;

type IsValid<S extends string> =
  Split<S, '/'> extends [
    infer First extends string,
    ...infer Rest extends string[],
  ]
    ? FirstIsValid<First> extends true
      ? Rest extends []
        ? false
        : ValidateRest<Rest>
      : false
    : false;

// ✅ Good
type T1 = Expect<IsValid<'@App/Service'>>; // true
type T2 = Expect<IsValid<'@AppService/Name'>>; // true
type T3 = Expect<IsValid<'@App/Service_v2'>>; // true (underscore ok)
type T4 = Expect<IsValid<'@App/Service$V2'>>; // true (dash ok)
type T5 = Expect<IsValid<'@MyApp/Deep/Nested/Service'>>; // true
type T6 = Expect<IsValid<'@App/ServiceAlpha123'>>;

// ❌ Bad
type E1 = ExpectFalse<IsValid<'App/Service'>>; // false (no "@")
type E2 = ExpectFalse<IsValid<'@123/Service'>>; // false (digit start)
type E3 = ExpectFalse<IsValid<'@App//Service'>>; // false (double slash)
type E4 = ExpectFalse<IsValid<'@App/Service!'>>; // false (illegal char)
type E5 = ExpectFalse<IsValid<'@App/'>>; // false (trailing slash)
type E6 = ExpectFalse<IsValid<'@/Service'>>; // false (empty namespace)
type E7 = ExpectFalse<IsValid<'@App/ Service'>>; // false (space in name)
type E8 = ExpectFalse<IsValid<'@App/Service-'>>; // false (illegal char $)
type E9 = ExpectFalse<IsValid<'@App/Ser%vice'>>; // false (illegal char %)
type E10 = ExpectFalse<IsValid<'@App/Serv#ice'>>; // false (illegal char #)
type E11 = ExpectFalse<IsValid<'@App/Service?'>>; // false (illegal char ?)
type E12 = ExpectFalse<IsValid<'123Service'>>;
type E13 = ExpectFalse<IsValid<'@App/.Service'>>; // false (dot start)
type E14 = ExpectFalse<IsValid<'@App/0Service'>>; // false (leading digit again)
type E15 = ExpectFalse<IsValid<'@123App/Service'>>; // false (first segment starts with digit)
type E16 = ExpectFalse<IsValid<'@App/Service/'>>; // false (trailing slash again)
type E17 = ExpectFalse<IsValid<'@App//Sub/Service'>>; // false (double slash deeper)
type E18 = ExpectFalse<IsValid<'@'>>; // false (only @, nothing else)
type E19 = ExpectFalse<IsValid<'@App'>>; // false (no service segment)
type E20 = ExpectFalse<IsValid<'@App/Ser[vice]'>>;
type E21 = ExpectFalse<IsValid<'@@App/Service'>>; // multiple @
type E22 = ExpectFalse<IsValid<'@App@/Service'>>; // misplaced @
type E23 = ExpectFalse<IsValid<'@App/Service@Name'>>; // @ inside segment
type E24 = ExpectFalse<IsValid<'@App/Service /Name'>>; // space before slash
type E25 = ExpectFalse<IsValid<'@App/ Service/Name'>>; // space at segment start
type E26 = ExpectFalse<IsValid<''>>; // empty string
type E27 = ExpectFalse<IsValid<'@'>>; // just @
type E28 = ExpectFalse<IsValid<'@/App'>>; // missing service segment
type E29 = ExpectFalse<IsValid<'@/Service'>>; // empty namespace
type E30 = ExpectFalse<IsValid<'@123App/Service'>>; // namespace starts with digit
type E31 = ExpectFalse<IsValid<'@App/0Service'>>; // segment starts with digit
type E32 = ExpectFalse<IsValid<'@App/0Service0'>>; // segment ends with digit (should be fine if digits allowed — test this explicitly)
type E33 = ExpectFalse<IsValid<'@A//B/C///D/Service$'>>; // multiple double/triple slashes + illegal char
type E34 = ExpectFalse<
  IsValid<'@A/B/C/D/E/F/G/H/I/J/K/L/M/N/O/P/Q/R/S/T/U/V/W/X/Y/Z//Service'>
>; // deep nesting + double slash

// ❌ Extreme E cases
type E35 = ExpectFalse<IsValid<'@App//Sub//Service'>>; // double slash deep
type E36 = ExpectFalse<IsValid<'@App///Service'>>; // triple slash
type E37 = ExpectFalse<IsValid<'@App/Serv‌ice'>>; // zero-width char inside
type E38 = ExpectFalse<IsValid<'@App/Servⅳce'>>; // Unicode Roman numeral
type E39 = ExpectFalse<IsValid<'@App/Ser\u200bvice'>>; // zero-width space
type E40 = ExpectFalse<IsValid<'@App/Serv\u00A0ice'>>; // non-breaking space
type E41 = ExpectFalse<IsValid<'@App/-Service'>>; // hyphen at start
type E42 = ExpectFalse<IsValid<'@App/_Service'>>; // underscore start
type E43 = ExpectFalse<IsValid<'@App/.Service'>>; // dot start
type E44 = ExpectFalse<IsValid<'@App/Service.'>>; // dot end
type E45 = ExpectFalse<IsValid<'@App/Service..Name'>>; // double dot inside
type E46 = ExpectFalse<IsValid<'@App/Serv-ice!'>>; // dash + illegal char
type E47 = ExpectFalse<IsValid<'@App/Ser%vice'>>; // percent sign
type E48 = ExpectFalse<IsValid<'@App/Serv#ice'>>; // hash symbol
type E49 = ExpectFalse<IsValid<'@App/Service!'>>; // exclamation mark
type E50 = ExpectFalse<IsValid<'@App/Service?'>>; // question mark
type E51 = ExpectFalse<IsValid<'@App/Service&Name'>>; // ampersand
type E52 = ExpectFalse<IsValid<'@@App/Service'>>; // multiple @ signs
type E53 = ExpectFalse<IsValid<'@App@/Service'>>; // misplaced @
type E54 = ExpectFalse<IsValid<'@App/Service@Name'>>; // @ inside segment
type E55 = ExpectFalse<IsValid<'@App/Service /Name'>>; // space before slash
type E56 = ExpectFalse<IsValid<'@App/ Service/Name'>>; // space at segment start
type E57 = ExpectFalse<IsValid<''>>; // empty string
type E58 = ExpectFalse<IsValid<'@'>>; // just "@"
type E59 = ExpectFalse<IsValid<'@/App'>>; // missing service segment
type E60 = ExpectFalse<IsValid<'@/Service'>>; // empty namespace
type E61 = ExpectFalse<IsValid<'@123App/Service'>>; // namespace starts with digit
type E62 = ExpectFalse<IsValid<'@App/0Service'>>; // segment starts with digit
type E63 = ExpectFalse<IsValid<'@App/0Service0'>>; // digits in wrong position
type E64 = ExpectFalse<IsValid<'@A//B/C///D/Service$'>>; // double/triple slashes + illegal char
type E65 = ExpectFalse<
  IsValid<'@A/B/C/D/E/F/G/H/I/J/K/L/M/N/O/P/Q/R/S/T/U/V/W/X/Y/Z//Service'>
>; // extreme deep nesting + double slash

// Unicode / tricky invisible chars
type E66 = ExpectFalse<IsValid<'@App/Serv\u200Cice'>>; // zero-width non-joiner
type E67 = ExpectFalse<IsValid<'@App/Serv\u200Dice'>>; // zero-width joiner
type E68 = ExpectFalse<IsValid<'@App/Serv\uFEFFice'>>; // zero-width no-break space (BOM)
type E69 = ExpectFalse<IsValid<'@App/Serv\u202Fice'>>; // narrow no-break space
type E70 = ExpectFalse<IsValid<'@App/Serv\u2060ice'>>; // word joiner
type E71 = ExpectFalse<IsValid<'@App/Serv\u00ADice'>>; // soft hyphen

// Complex mixing edge cases
type E72 = ExpectFalse<IsValid<'@App/Serv ice/Name'>>; // space inside
type E73 = ExpectFalse<IsValid<'@App/Serv/ice/Name!'>>; // illegal char deep
type E74 = ExpectFalse<IsValid<'@App/Serv..ice/Name'>>; // double dot deep
type E75 = ExpectFalse<IsValid<'@App//Serv/ice/Name'>>; // multiple double slashes deep
