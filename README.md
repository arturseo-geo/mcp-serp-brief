# mcp-serp-brief

MCP server that generates SERP-targeted content briefs using DataForSEO and Claude AI. Analyzes search engine results and produces actionable content strategies for writers and SEO professionals.

## Features

- **SERP Analysis** — Real-time search results analysis with featured snippets, People Also Ask, and answer box detection
- **AI-Powered Briefs** — Claude generates comprehensive content strategies based on SERP competitiveness
- **Customizable Output** — Target length (short/medium/long) and tone (professional/casual/technical)
- **Structured Data** — JSON-formatted SERP insights including top domains, rank positions, and content types

## Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file in the project root:

```env
DATAFORSEO_LOGIN=your_dataforseo_email
DATAFORSEO_PASSWORD=your_dataforseo_password
ANTHROPIC_API_KEY=your_anthropic_api_key
```

**Required credentials:**
- DataForSEO: Email and password from [api.dataforseo.com](https://api.dataforseo.com)
- Anthropic: API key from [console.anthropic.com](https://console.anthropic.com)

## Usage

### Start the Server

```bash
npm start
```

The server will start on stdio and be available to MCP clients.

### Tool: `analyze_serp`

Analyzes search engine results for a given keyword.

**Parameters:**
- `keyword` (required) — The search term to analyze
- `location_name` (optional, default: "United States") — Geographic location for results
- `language_code` (optional, default: "en") — Language code (e.g., "en", "de", "fr")
- `depth` (optional, default: 10) — Number of results (10-100)

**Example:**

```json
{
  "keyword": "sustainable packaging materials",
  "location_name": "United Kingdom",
  "language_code": "en",
  "depth": 20
}
```

**Response includes:**
- Top 5 ranking domains with titles and descriptions
- Featured snippet content (up to 3)
- People Also Ask questions (up to 3)
- Answer box data if present

### Tool: `generate_brief`

Generates a SERP-targeted content brief using analyze_serp data.

**Parameters:**
- `keyword` (required) — The target keyword
- `serp_data` (required) — Output from analyze_serp tool
- `target_length` (optional, default: "medium") — "short" (800-1000 words), "medium" (1500-2000 words), or "long" (2500-3500 words)
- `tone` (optional, default: "professional") — "professional", "casual", or "technical"

**Example:**

```json
{
  "keyword": "sustainable packaging materials",
  "serp_data": { /* from analyze_serp */ },
  "target_length": "medium",
  "tone": "professional"
}
```

**Output includes:**
- Content outline with H2/H3 headers
- Target keyword placement strategy
- Key topics derived from SERP analysis
- FAQ section recommendations
- Internal/external linking strategy
- Content format recommendations
- Estimated word count and reading time
- Quality scoring rubric (0-100)

## Workflow Example

1. **Analyze SERP:**
   ```
   analyze_serp(keyword="AI in healthcare", depth=15)
   ```

2. **Review Results:**
   - Identify top competitors
   - Note featured snippets and PAA questions
   - Assess content gaps

3. **Generate Brief:**
   ```
   generate_brief(
     keyword="AI in healthcare",
     serp_data={...},
     target_length="long",
     tone="professional"
   )
   ```

4. **Use Brief for Content:**
   - Follow H2/H3 outline structure
   - Incorporate recommended topics
   - Include FAQ section
   - Apply keyword placement strategy

## Quality Scoring Rubric (0-100)

Briefs include a quality score evaluating:

- **Competitiveness** (0-20) — SERP difficulty and competitor strength
- **Content Gap** (0-20) — Identified opportunities to differentiate
- **Topic Coverage** (0-20) — Comprehensiveness vs. top-ranking pages
- **Structure** (0-20) — Outline clarity and logical flow
- **SEO Viability** (0-20) — Keyword placement and link strategy feasibility

**Score interpretation:**
- 80-100 — Excellent opportunity; high ranking potential
- 60-79 — Good opportunity; solid ranking potential
- 40-59 — Moderate opportunity; requires differentiation
- 0-39 — Challenging SERP; consider repositioning or unique angle

## API Integration

### DataForSEO

Uses the `/v3/serp/google/organic/live/advanced` endpoint with:
- Basic authentication (email:password in Base64)
- JSON request body with keyword, location, language, depth
- Live SERP results with element type detection

### Anthropic Claude

Uses the `/v1/messages` endpoint with:
- Claude Sonnet 4 (claude-sonnet-4-20250514) for brief generation
- System prompt focused on SEO content strategy
- 2048 token limit for comprehensive but concise output

## Error Handling

- Missing environment variables — Server fails at startup with clear error
- DataForSEO API errors — Includes HTTP status and response body
- Claude API errors — Includes HTTP status and error details
- Malformed SERP data — Returns error with validation context

## Requirements

- Node.js 18.0.0 or higher
- Active DataForSEO account with API access
- Active Anthropic API key with Claude Sonnet 4 access

## License

MIT — See LICENSE file

## Author

Artur — [arturseo-geo](https://github.com/arturseo-geo)

## Repository

[github.com/arturseo-geo/mcp-serp-brief](https://github.com/arturseo-geo/mcp-serp-brief)

---

[Artur Ferreira / The GEO Lab](https://thegeolab.net) · [X/Twitter](https://x.com/TheGEO_Lab) · [LinkedIn](https://linkedin.com/in/arturgeo)
