export function isHtmlBlockStart(line: string) {
  return /^<\/?[A-Za-z][\w:-]*(?:\s|>|\/>|$)/.test(line.trim()) || line.trim().startsWith("<!--");
}

export function renderHtmlBlock(lines: string[], index: number) {
  const html: string[] = [lines[index] ?? ""];

  while (index + 1 < lines.length && (lines[index + 1] ?? "").trim()) {
    index += 1;
    html.push(lines[index] ?? "");
  }

  return {
    html: html.join("\n"),
    index,
  };
}
