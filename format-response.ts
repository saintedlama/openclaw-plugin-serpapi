import { SerpApiResponse } from "./types";

export function formatResponse(data: SerpApiResponse, query: string, resultCount: number): string {
  const parts: string[] = [];

  const info = data.search_information;
  const totalStr = info?.total_results != null ? ` (${info.total_results.toLocaleString()} results)` : "";
  parts.push(`## Search: ${info?.query_displayed ?? query}${totalStr}`);

  // Answer box — direct answer, shown first
  const ab = data.answer_box;
  if (ab) {
    const abParts: string[] = [];
    if (ab.title) abParts.push(`**${ab.title}**`);
    const abAnswer = ab.answer ?? ab.snippet;
    if (abAnswer) abParts.push(abAnswer);
    if (ab.link) abParts.push(`Source: ${ab.displayed_link ?? ab.link} — ${ab.link}`);
    if (abParts.length) {
      parts.push(`\n### Answer\n${abParts.join("\n")}`);
    }
  }

  // Knowledge graph — entity summary
  const kg = data.knowledge_graph;
  if (kg?.title) {
    const kgLines: string[] = [];
    const heading = kg.type ? `${kg.title} — ${kg.type}` : kg.title;
    kgLines.push(`### ${heading}`);
    if (kg.description) kgLines.push(kg.description);
    if (kg.source?.name && kg.source.link) {
      kgLines.push(`Source: [${kg.source.name}](${kg.source.link})`);
    }
    parts.push(`\n${kgLines.join("\n")}`);
  }

  // Organic results
  const organic = (data.organic_results ?? []).slice(0, resultCount);
  if (organic.length > 0) {
    const lines: string[] = ["\n### Organic Results"];
    for (const r of organic) {
      const title = r.title ?? "(no title)";
      const url = r.link ?? "";
      const display = r.displayed_link ?? url;
      const source = r.source ? ` — ${r.source}` : "";
      lines.push(`\n**${r.position ?? ""}. ${title}**${source}`);
      lines.push(`${display}`);
      if (r.snippet) lines.push(r.snippet);
      // Rich snippet extensions (e.g. "Free delivery", price range)
      const extensions = r.rich_snippet?.bottom?.extensions;
      if (extensions?.length) lines.push(extensions.join(" · "));
      // Top sitelinks
      const sitelinks = r.sitelinks?.inline?.slice(0, 3);
      if (sitelinks?.length) {
        lines.push(`  ↳ ${sitelinks.map((s) => `[${s.title}](${s.link})`).join(" · ")}`);
      }
    }
    parts.push(lines.join("\n"));
  } else {
    parts.push("\nNo organic results found.");
  }

  // Related questions — top 3
  const questions = (data.related_questions ?? []).slice(0, 3);
  if (questions.length > 0) {
    const lines: string[] = ["\n### People Also Ask"];
    for (const q of questions) {
      if (!q.question) continue;
      lines.push(`\n**${q.question}**`);
      const answer = q.snippet ?? (q.list ? q.list.slice(0, 3).join("; ") : undefined);
      if (answer) lines.push(answer);
      if (q.link) lines.push(`Source: ${q.displayed_link ?? q.link}`);
    }
    parts.push(lines.join("\n"));
  }

  return parts.join("\n");
}
