// components/diary/WritingRail.tsx
import Link from 'next/link';
import { SeasonNote } from '@/components/diary/SeasonNote';

interface WritingRailProps {
  focusDate: string; // YYYY-MM-DD（書いている日）
}

// 右レール（文机の道具一式）。季節のたよりと、履歴への控えめな導線を縦に積む。
export function WritingRail({ focusDate }: WritingRailProps) {
  return (
    <div className="space-y-6">
      <SeasonNote date={focusDate} />
      <div className="border-t pt-6">
        <Link
          href="/history"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          これまでの記録 →
        </Link>
      </div>
    </div>
  );
}
