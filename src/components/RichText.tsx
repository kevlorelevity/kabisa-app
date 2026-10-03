import { Fragment, type ReactNode } from 'react';

/** Renders the tiny inline markup used in grammar explainers: **bold** and *italic*. */
export function RichText({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={i++}>{text.slice(last, m.index)}</Fragment>);
    if (m[1] !== undefined) {
      out.push(
        <strong key={i++} className="font-semibold text-gray-900">
          {m[1]}
        </strong>,
      );
    } else {
      out.push(
        <em key={i++} className="italic text-green-900">
          {m[2]}
        </em>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(<Fragment key={i++}>{text.slice(last)}</Fragment>);
  return <>{out}</>;
}
