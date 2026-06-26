import {
  CENTER_COLOR_VARS,
  CENTER_LABELS,
  CENTER_MEMBERS,
  CENTER_ORDER,
  ENNEAGRAM_TYPES,
} from '@/lib/enneagram/types';

// シンボル図の番号が何タイプかを示す凡例。センターごとに色分けして表示。
export function EnneagramLegend() {
  return (
    <ul className="space-y-2 text-xs">
      {CENTER_ORDER.map((center) => (
        <li key={center} className="space-y-1">
          <div
            className="flex items-center gap-1.5 font-medium"
            style={{ color: CENTER_COLOR_VARS[center] }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CENTER_COLOR_VARS[center] }}
            />
            {CENTER_LABELS[center]}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-4 text-muted-foreground">
            {CENTER_MEMBERS[center].map((t) => (
              <span key={t}>
                <span
                  className="font-medium tabular-nums"
                  style={{ color: CENTER_COLOR_VARS[center] }}
                >
                  {t}
                </span>{' '}
                {ENNEAGRAM_TYPES[t].name}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
