import { Type } from "@sinclair/typebox";
import { getJson } from "serpapi";
import { OpenClawPluginApi, OpenClawPluginLogger, SerpApiConfig, SerpApiResponse } from "./types";

const DEFAULT_RESULT_COUNT = 10;
const MAX_RESULT_COUNT = 100;
const PLUGIN_ID = "openclaw-serpapi";


export default function register(api: OpenClawPluginApi): void {
  const logger: OpenClawPluginLogger = {
    debug: (msg) => api.logger.debug?.(`[SERPAPI] ${msg}`),
    info: (msg) => api.logger.info(`[SERPAPI] ${msg}`),
    warn: (msg) => api.logger.warn(`[SERPAPI] ${msg}`),
    error: (msg) => api.logger.error(`[SERPAPI] ${msg}`),
  };

  logger.info("Registering SerpAPI Web Search plugin");

  api.registerTool({
    name: "serpapi_web_search",
    description: `
      Search the web using SerpAPI and return the top organic results.
      Use this to look up current information, facts, URLs, or news about any topic.
      Optional parameters can be used to localize results by country (gl), language (hl), or location.
    `.trim(),

    parameters: Type.Object({
      query: Type.String({
        description: "The search query.",
      }),
      num: Type.Optional(
        Type.Number({
          description: `Number of results to return (1 to ${MAX_RESULT_COUNT}). Defaults to the plugin's configured value or ${DEFAULT_RESULT_COUNT}.`,
          minimum: 1,
          maximum: MAX_RESULT_COUNT,
        }),
      ),
      gl: Type.Optional(
        Type.String({
          description: 'Two-letter country code for localizing results, e.g. "us", "gb", "de". Optional. Default "us"',
        }),
      ),
      hl: Type.Optional(
        Type.String({
          description: 'Language code for results, e.g. "en", "de", "fr". Optional. Default "en"',
        }),
      ),
      location: Type.Optional(
        Type.String({
          description: `The location to use for the search. Optional. Default "United States"`,
        }),
      ),
      google_domain: Type.Optional(
        Type.String({
          description: `The Google domain to use for the search. Optional. Default "google.com"`,
        }),
      ),
    }),

    async execute(
      _id: string,
      params: {
        location: string;
        query: string;
        num?: number;
        gl?: string;
        hl?: string;
        google_domain?: string;
      },
    ) {
      logger.info("Executing serpapi-web-search with query: " + params.query);

      const cfg: SerpApiConfig = api.config.plugins?.entries[PLUGIN_ID]?.config ?? {};

      const apiKey = cfg.apiKey ?? process.env["SERPAPI-WEB-SEARCH-KEY"];

      if (!apiKey) {
        logger.error("SerpAPI key is not configured.");

        return {
          content: [
            {
              type: "text",
              text: `SerpAPI key is not configured. Add it under plugins.entries.${PLUGIN_ID}.config.apiKey in your OpenClaw config.`,
            },
          ],
        };
      }

      const resultCount = Math.min(params.num ?? cfg.resultCount ?? DEFAULT_RESULT_COUNT, MAX_RESULT_COUNT);

      let data: SerpApiResponse;
      try {
        data = (await getJson({
          engine: "google", // TODO: Support other engines like Bing, News, etc.?
          q: params.query,
          location: params.location ?? "United States",
          google_domain: params.google_domain ?? "google.com",
          hl: params.hl ?? "en",
          gl: params.gl ?? "us",
          num: resultCount,
          api_key: apiKey,
        })) as SerpApiResponse;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`SerpAPI request failed: ${message}`);

        return {
          content: [{ type: "text", text: `SerpAPI request failed: ${message}` }],
        };
      }

      if (data.error) {
        logger.error(`SerpAPI error: ${data.error}`);

        return {
          content: [{ type: "text", text: `SerpAPI error: ${data.error}` }],
        };
      }

      const text = formatResponse(data, params.query, resultCount);

      return {
        content: [
          {
            type: "text",
            text,
          },
        ],
      };
    },
  });
}

function formatResponse(data: SerpApiResponse, query: string, resultCount: number): string {
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
