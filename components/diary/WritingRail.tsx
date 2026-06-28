// components/diary/WritingRail.tsx
import { SeasonNote } from '@/components/diary/SeasonNote';
import { StreakPanel } from '@/components/diary/StreakPanel';

interface WritingRailProps {
  streak: number;
  entryDates: readonly string[];
  focusDate: string;
  today: string;
}

// 右レール（文机の道具一式）。控えめな伴走情報を縦に積む。
export function WritingRail(props: WritingRailProps) {
  return (
    <div className="space-y-6">
      <StreakPanel {...props} />
      <div className="border-t pt-6">
        <SeasonNote date={props.focusDate} />
      </div>
    </div>
  );
}
