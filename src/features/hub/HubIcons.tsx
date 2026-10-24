/**
 * Solid glyphs for the phone's tab bar, drawn for the studio: the same soft
 * rounded corners as the boxes, filled like iOS tab icons.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Glyph({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

/** Overview: a card with its checklist. */
export function OverviewIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path
        fillRule="evenodd"
        d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm1.2 5.4a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm3 .45a.75.75 0 0 0 0 1.5h5.3a.75.75 0 0 0 0-1.5h-5.3Zm-3 4.35a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm3 .45a.75.75 0 0 0 0 1.5h5.3a.75.75 0 0 0 0-1.5h-5.3Z"
      />
    </Glyph>
  );
}

/** Plan: the bento of boxes. */
export function PlanIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <rect x="3" y="3" width="8" height="8" rx="2.6" />
      <rect x="13" y="3" width="8" height="8" rx="2.6" />
      <rect x="3" y="13" width="8" height="8" rx="2.6" />
      <rect x="13" y="13" width="8" height="8" rx="2.6" />
    </Glyph>
  );
}

/** Dates: a calendar page. */
export function ScheduleIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <rect x="7" y="2" width="2" height="4" rx="1" />
      <rect x="15" y="2" width="2" height="4" rx="1" />
      <path
        fillRule="evenodd"
        d="M7 4.5h10a4 4 0 0 1 4 4V17a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8.5a4 4 0 0 1 4-4Zm-1.5 6V17A1.5 1.5 0 0 0 7 18.5h10a1.5 1.5 0 0 0 1.5-1.5v-6.5h-13Zm2.5 2h2.4v2.4H8v-2.4Zm4.8 0h2.4v2.4h-2.4v-2.4Z"
      />
    </Glyph>
  );
}

/** Budget: a wallet. */
export function BudgetIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M6 3.5h9.5a2 2 0 0 1 1.94 1.5L17.7 6H6.5a1 1 0 0 0 0 2" />
      <path
        fillRule="evenodd"
        d="M6.5 7H18a3 3 0 0 1 3 3v7a3.5 3.5 0 0 1-3.5 3.5h-11A3.5 3.5 0 0 1 3 17V7c0 .55.45 1 1 1h2.5V7Zm10 5.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z"
      />
    </Glyph>
  );
}

/** Discussion: a speech bubble. */
export function DiscussionIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 3c5 0 9 3.4 9 7.75S17 18.5 12 18.5c-.8 0-1.6-.08-2.35-.25L5.3 20.6c-.55.3-1.17-.25-.95-.83l1.02-2.67C3.9 15.68 3 13.82 3 10.75 3 6.4 7 3 12 3Z" />
    </Glyph>
  );
}

/** People: two of them. */
export function PeopleIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="9" cy="7.5" r="3.5" />
      <path d="M2.5 18.2C2.5 15 5.4 12.8 9 12.8s6.5 2.2 6.5 5.4c0 .97-.78 1.8-1.75 1.8H4.25c-.97 0-1.75-.83-1.75-1.8Z" />
      <circle cx="16.8" cy="8.3" r="2.8" />
      <path d="M17.2 20h3.3c.83 0 1.5-.7 1.5-1.55 0-2.75-2.2-4.6-5.1-4.6-.7 0-1.37.1-1.98.3a6.3 6.3 0 0 1 2.28 4.75c0 .4-.03.75 0 1.1Z" />
    </Glyph>
  );
}
