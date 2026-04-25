const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const TRAILING_PUNCTUATION_PATTERN = /[.,!?;:)\]}]+$/;

function getHref(url) {
  return url.toLowerCase().startsWith("www.") ? `https://${url}` : url;
}

function renderLinkedText(text, keyPrefix) {
  const parts = [];
  let lastIndex = 0;
  let match;

  URL_PATTERN.lastIndex = 0;

  while ((match = URL_PATTERN.exec(text)) !== null) {
    const rawUrl = match[0];
    const beforeUrl = text.slice(lastIndex, match.index);
    const trailingMatch = rawUrl.match(TRAILING_PUNCTUATION_PATTERN);
    const trailingText = trailingMatch?.[0] || "";
    const cleanUrl = trailingText ? rawUrl.slice(0, -trailingText.length) : rawUrl;

    if (beforeUrl) {
      parts.push(beforeUrl);
    }

    if (cleanUrl) {
      parts.push(
        <a
          key={`${keyPrefix}-url-${match.index}`}
          href={getHref(cleanUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-sky-600 underline underline-offset-2 transition hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
        >
          {cleanUrl}
        </a>
      );
    }

    if (trailingText) {
      parts.push(trailingText);
    }

    lastIndex = match.index + rawUrl.length;
  }

  const remainingText = text.slice(lastIndex);

  if (remainingText) {
    parts.push(remainingText);
  }

  return parts;
}

export default function TourDescription({ description, compact = false, className = "" }) {
  const text = String(description || "").trim();

  if (!text) {
    return null;
  }

  const paragraphs = text.split(/\n{2,}/).filter((paragraph) => paragraph.trim());

  return (
    <div
      className={`space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300 ${
        compact ? "max-h-44 overflow-hidden" : "text-base leading-8"
      } ${className}`}
    >
      {paragraphs.map((paragraph, paragraphIndex) => {
        const lines = paragraph.split(/\n/);

        return (
          <p key={`${paragraphIndex}-${paragraph.slice(0, 16)}`} className="break-words">
            {lines.map((line, lineIndex) => (
              <span key={`${paragraphIndex}-${lineIndex}`}>
                {renderLinkedText(line, `${paragraphIndex}-${lineIndex}`)}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
