import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();


export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

/**
 * Searches the web using Tavily if API key is present, otherwise falls back to DuckDuckGo scraping.
 */
export async function searchWeb(query: string): Promise<SearchResult[]> {
  const tavilyApiKey = process.env.TAVILY_API_KEY;

  if (tavilyApiKey) {
    try {
      console.log(`Searching Tavily for: "${query}"`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyApiKey,
          query: query,
          max_results: 5,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.results && Array.isArray(data.results)) {
          return data.results.map((r: any) => ({
            title: r.title || "",
            snippet: r.content || r.snippet || "",
            url: r.url || "",
          }));
        }
      }
    } catch (error) {
      console.error("Tavily search API failed, falling back to DuckDuckGo:", error);
    }
  }

  // Fallback to DuckDuckGo HTML scraper
  try {
    console.log(`Searching DuckDuckGo (No-Key Fallback) for: "${query}"`);
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`DDG HTML search returned status ${response.status}`);
    }

    const html = await response.text();
    const results: SearchResult[] = [];

    // Parse DDG HTML results using regular expressions
    // DDG HTML results look like:
    // <div class="web-result">
    //   <a class="result__url" href="URL">...</a>
    //   <h2 class="result__title"><a class="result__a" href="URL">Title</a></h2>
    //   <a class="result__snippet" href="URL">Snippet...</a>
    // </div>
    const resultBlockRegex = /<div class="result results_links results_links_deep[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    let match;
    while ((match = resultBlockRegex.exec(html)) !== null && results.length < 5) {
      const block = match[1];

      // Extract URL and Title
      const titleMatch = block.match(/<a class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      const snippetMatch = block.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);

      if (titleMatch) {
        const rawUrl = titleMatch[1];
        // Clean DDG redirect URL if present (e.g. //duckduckgo.com/l/?uddg=URL)
        let cleanUrl = rawUrl;
        if (rawUrl.includes("uddg=")) {
          const parts = rawUrl.split("uddg=");
          if (parts[1]) {
            cleanUrl = decodeURIComponent(parts[1].split("&")[0]);
          }
        }

        const title = titleMatch[2]
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .trim();

        const snippet = snippetMatch
          ? snippetMatch[1]
              .replace(/<[^>]*>/g, "")
              .replace(/&amp;/g, "&")
              .replace(/&quot;/g, '"')
              .replace(/&#x27;/g, "'")
              .trim()
          : "";

        results.push({
          title,
          snippet,
          url: cleanUrl.startsWith("//") ? `https:${cleanUrl}` : cleanUrl,
        });
      }
    }

    if (results.length === 0) {
      // Direct backup match in case structure changed
      const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      let sMatch;
      while ((sMatch = snippetRegex.exec(html)) !== null && results.length < 5) {
        const snippetText = sMatch[1]
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .trim();
        results.push({
          title: `Search Result ${results.length + 1}`,
          snippet: snippetText,
          url: "",
        });
      }
    }

    return results;
  } catch (error) {
    console.error("DuckDuckGo scraping failed:", error);
    return [];
  }
}

/**
 * Resolves a company name to a stock ticker and fetches key financials.
 */
export async function resolveTickerAndFinancials(companyName: string): Promise<{
  ticker: string;
  isPublic: boolean;
  sector: string;
  industry: string;
  financials: any;
}> {
  try {
    console.log(`Searching ticker for: "${companyName}"`);
    const searchResults: any = await yahooFinance.search(companyName);

    // Filter to find a stock symbol
    const stockResult = searchResults.quotes.find(
      (q: any) => q.isYahooFinance === true || q.quoteType === "EQUITY"
    );

    if (!stockResult || !stockResult.symbol) {
      console.log(`No public stock symbol found for "${companyName}"`);
      return {
        ticker: "",
        isPublic: false,
        sector: "Unknown",
        industry: "Unknown",
        financials: {},
      };
    }

    const ticker = stockResult.symbol;
    console.log(`Found ticker: ${ticker} (${stockResult.shortname || stockResult.longname})`);

    // Fetch financials using quoteSummary
    const summary: any = await yahooFinance.quoteSummary(ticker, {
      modules: ["summaryDetail", "financialData", "defaultKeyStatistics", "assetProfile"],
    });

    const assetProfile = summary.assetProfile || {};
    const summaryDetail = summary.summaryDetail || {};
    const financialData = summary.financialData || {};
    const keyStats = summary.defaultKeyStatistics || {};

    const financialsFormatted = {
      price: summaryDetail.previousClose || financialData.currentPrice,
      marketCap: summaryDetail.marketCap,
      peRatio: summaryDetail.trailingPE || keyStats.trailingPE,
      dividendYield: summaryDetail.dividendYield ? summaryDetail.dividendYield * 100 : undefined, // in %
      eps: keyStats.trailingEps,
      profitMargins: financialData.profitMargins ? financialData.profitMargins * 100 : undefined, // in %
      revenueGrowth: financialData.revenueGrowth ? financialData.revenueGrowth * 100 : undefined, // in %
      debtToEquity: financialData.debtToEquity,
      currentRatio: financialData.currentRatio,
      freeCashFlow: financialData.freeCashflow,
      recommendationMean: financialData.recommendationMean,
      summary: assetProfile.longBusinessSummary || "",
    };

    return {
      ticker,
      isPublic: true,
      sector: assetProfile.sector || "Unknown",
      industry: assetProfile.industry || "Unknown",
      financials: financialsFormatted,
    };
  } catch (error) {
    console.error(`Failed to fetch Yahoo Finance financials for "${companyName}":`, error);
    return {
      ticker: "",
      isPublic: false,
      sector: "Unknown",
      industry: "Unknown",
      financials: {},
    };
  }
}
