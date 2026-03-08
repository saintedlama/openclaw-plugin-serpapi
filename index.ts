import { Type } from "@sinclair/typebox";
import { getJson, getAccount } from "serpapi";
import { OpenClawPluginApi, OpenClawPluginLogger, SerpApiAccountInfo, SerpApiConfig, SerpApiResponse } from "./types";
import { formatResponse } from "./format-response";

const DEFAULT_RESULT_COUNT = 10;
const MAX_RESULT_COUNT = 100;
const PLUGIN_ID = "serpapi";


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

      // Fire-and-forget: log remaining quota at debug level, does not affect response time
      void getAccount({ api_key: apiKey }).then((account) => {
        const info = account as SerpApiAccountInfo;
        const left = info.plan_searches_left ?? info.total_searches_left;
        if (left != null) {
          logger.debug?.(`SerpAPI quota: ${left} searches remaining (${info.this_month_usage ?? "?"} used this month)`);
        }
      }).catch(() => {
        // Best-effort — quota logging failures must not affect tool results
      });

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
