[![make.fun · markdown-render-speed-02](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/dnnsprytmn/markdown-render-speed/rank.svg)](https://make.fun/bounty/markdown-render-speed-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/dnnsprytmn/markdown-render-speed/reward.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)

# Markdown renderer

This project is entered in the [make.fun markdown-render-speed-02 bounty](https://make.fun/bounty/markdown-render-speed-02).

A dependency-free Markdown to HTML renderer for the `program/v1` harness. It runs on Node.js 22 or later and keeps per-document state isolated.

## Harness contract

The program reads `/input/cases.json` as an array of objects with a string `markdown` property, renders each case in order, and writes a JSON array of HTML strings to `/output/html.json`. Set `MAKEFUN_INPUT_DIR` and `MAKEFUN_OUTPUT_DIR` to use other directories.

```json
[{"markdown":"# Hello"}]
```

Run with `node main.ts` (or `npm start`). The exported `parse(markdown)` function is also available from `parse.js`.

## Coverage

The parser implements common block and inline Markdown features, including ATX and setext headings, fenced and indented code, block quotes, recursive lists, task items, link definitions and references, inline links and images, emphasis and strikethrough, autolinks, raw HTML blocks and inline HTML, entities, and GFM tables. This is a standalone implementation and does not bundle or copy a third-party renderer.

## License

MIT. See [LICENSE](LICENSE).

---

Entry: [make.fun](https://make.fun/?ref=hcje3a1b&utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02) · Referral code: `hcje3a1b`
