import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export function Tex({
  tex,
  block = false,
  className = "",
}: {
  tex: string;
  block?: boolean;
  className?: string;
}) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        throwOnError: false,
        displayMode: block,
        strict: false,
      }),
    [tex, block]
  );
  return (
    <span
      className={className}
      style={{ display: block ? "block" : "inline-block" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
