export interface ColorLiteralMatch {
  line: number;
  column: number;
  text: string;
}

// 生の色リテラルだけを検出する:
//  - 16進カラー #rgb / #rgba / #rrggbb / #rrggbbaa（5,7桁は色ではないので除外）
//  - 関数記法（rgb・rgba・hsl・hsla・oklch・oklab のいずれかに開き括弧が続くもの）
// var(--token) / color-mix(in oklab, var(--..) ..) / Tailwind の named color・不透明度修飾子・
// 任意サイズ値（色でない [15rem] 等）は検出しない。
const COLOR_LITERAL =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b|(?:rgba|rgb|hsla|hsl|oklch|oklab)\s*\(/g;

export function findColorLiterals(source: string): ColorLiteralMatch[] {
  const matches: ColorLiteralMatch[] = [];
  source.split('\n').forEach((lineText, i) => {
    COLOR_LITERAL.lastIndex = 0;
    let m: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: regex exec ループの定石
    while ((m = COLOR_LITERAL.exec(lineText)) !== null) {
      matches.push({ line: i + 1, column: m.index + 1, text: m[0] });
    }
  });
  return matches;
}
