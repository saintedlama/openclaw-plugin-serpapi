# openclaw-plugin-serpapi

OpenClaw plugin that gives your agent web search via [SerpAPI](https://serpapi.com). Registers the `serpapi_web_search` tool, which queries Google and returns organic results.

## 5-minute install

**1. Get a SerpAPI key**

Sign up at [serpapi.com/manage-api-key](https://serpapi.com/manage-api-key) and copy your API key.

**2. Install the plugin**

```sh
openclaw plugins install @saintedlama/openclaw-serpapi
```

**3. Add your API key to the OpenClaw config**

```json
{
  "plugins": {
    "entries": {
      "openclaw-serpapi": {
        "config": {
          "apiKey": "your-serpapi-key-here"
        }
      }
    }
  }
}
```

Alternatively, set the `SERPAPI-WEB-SEARCH-KEY` environment variable instead of putting the key in config.

**4. Restart the Gateway**

```sh
openclaw restart
```

The agent now has access to the `serpapi_web_search` tool.

## Configuration

| Field         | Type   | Default | Description                                      |
| ------------- | ------ | ------- | ------------------------------------------------ |
| `apiKey`      | string | —       | SerpAPI key (or set `SERPAPI-WEB-SEARCH-KEY` env) |
| `resultCount` | number | `10`    | Default number of organic results (1–100)        |

## Tool parameters

The `serpapi_web_search` tool accepts:

| Parameter       | Required | Description                                      |
| --------------- | -------- | ------------------------------------------------ |
| `query`         | yes      | Search query                                     |
| `num`           | no       | Number of results (1–100, overrides config default) |
| `gl`            | no       | Country code, e.g. `"us"`, `"gb"` (default: `"us"`) |
| `hl`            | no       | Language code, e.g. `"en"`, `"de"` (default: `"en"`) |
| `location`      | no       | Location string (default: `"United States"`)     |
| `google_domain` | no       | Google domain (default: `"google.com"`)          |

## License

MIT
