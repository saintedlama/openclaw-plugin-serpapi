import { describe, it, expect } from "vitest";
import { formatResponse } from "./format-response";
import type { SerpApiResponse } from "./types";
import exampleResponse from "./format-response.test.response.json";

const fixture = exampleResponse as unknown as SerpApiResponse;

describe("formatResponse", () => {
  it("includes the search heading with query and formatted result count", () => {
    const result = formatResponse(fixture, "Coffee", 10);
    expect(result).toContain("## Search: Coffee");
    expect(result).toContain("3,140,000,000 results");
  });

  it("falls back to the provided query when query_displayed is missing", () => {
    const result = formatResponse({ search_information: {} }, "fallback query", 5);
    expect(result).toContain("## Search: fallback query");
  });

  it("renders the knowledge graph when present", () => {
    const result = formatResponse(fixture, "Coffee", 10);
    expect(result).toContain("Coffee — Beverages");
    expect(result).toContain("Coffee is a beverage brewed from roasted");
    expect(result).toContain("Wikipedia");
  });

  it("renders organic results", () => {
    const result = formatResponse(fixture, "Coffee", 10);
    expect(result).toContain("### Organic Results");
    expect(result).toContain("**1. Coffee**");
    expect(result).toContain("Wikipedia");
  });

  it("limits organic results to resultCount", () => {
    const result2 = formatResponse(fixture, "Coffee", 2);
    expect(result2).toContain("**1.");
    expect(result2).toContain("**2.");
    expect(result2).not.toContain("**3.");
  });

  it("renders sitelinks for results that have them", () => {
    const result = formatResponse(fixture, "Coffee", 1);
    expect(result).toContain("History of coffee");
  });

  it("renders related questions when present", () => {
    const result = formatResponse(fixture, "Coffee", 10);
    expect(result).toContain("### People Also Ask");
  });

  it("handles a completely empty response gracefully", () => {
    const result = formatResponse({}, "empty", 5);
    expect(result).toContain("## Search: empty");
    expect(result).toContain("No organic results found.");
    expect(result).not.toContain("### Answer");
    expect(result).not.toContain("### People Also Ask");
  });

  it("renders an answer box when present", () => {
    const withAnswerBox: SerpApiResponse = {
      answer_box: {
        title: "Best Coffee",
        answer: "Arabica beans",
        link: "https://example.com",
        displayed_link: "example.com",
      },
    };
    const result = formatResponse(withAnswerBox, "best coffee", 5);
    expect(result).toContain("### Answer");
    expect(result).toContain("**Best Coffee**");
    expect(result).toContain("Arabica beans");
    expect(result).toContain("example.com");
  });

  it("omits an empty answer box", () => {
    const withEmptyBox: SerpApiResponse = { answer_box: {} };
    const result = formatResponse(withEmptyBox, "q", 5);
    expect(result).not.toContain("### Answer");
  });
});
