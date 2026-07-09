import fs from 'node:fs/promises';
import path from 'node:path';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

const baseUrl = process.env.SITE_AUDIT_BASE_URL ?? 'http://localhost:3000';
const outputDir = path.resolve('reports/site-quality/lighthouse');
const targets = [
  { name: 'home', path: '/?intro=0' },
  { name: 'search', path: '/search' },
  { name: 'product', path: '/products/premium-burger-offer-kit' },
  { name: 'checkout', path: '/checkout' },
];

await fs.mkdir(outputDir, { recursive: true });
await assertServerReady(baseUrl);

const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });

try {
  const rows = [];

  for (const target of targets) {
    const url = new URL(target.path, baseUrl).toString();
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });

    if (!result?.lhr) {
      throw new Error(`Lighthouse did not return a report for ${target.name}`);
    }

    const categories = result.lhr.categories;
    const scores = {
      performance: score(categories.performance.score),
      accessibility: score(categories.accessibility.score),
      bestPractices: score(categories['best-practices'].score),
      seo: score(categories.seo.score),
    };
    const average = Math.round((scores.performance + scores.accessibility + scores.bestPractices + scores.seo) / 4);

    await fs.writeFile(path.join(outputDir, `${target.name}.json`), JSON.stringify(result.lhr, null, 2));
    rows.push({ page: target.name, url, average, ...scores });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    pages: rows,
    average: Math.round(rows.reduce((sum, row) => sum + row.average, 0) / rows.length),
  };

  await fs.writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
  await fs.writeFile(path.join(outputDir, 'summary.md'), renderMarkdownSummary(summary));
  printSummary(summary);

  if (summary.average < 80 || rows.some((row) => row.accessibility < 90 || row.seo < 85)) {
    process.exitCode = 1;
  }
} finally {
  try {
    await chrome.kill();
  } catch (error) {
    console.warn(`Could not remove temporary Chrome profile: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function score(value) {
  return Math.round((value ?? 0) * 100);
}

function printSummary(summary) {
  console.log('\nSite quality score');
  console.log(`Base URL: ${summary.baseUrl}`);
  console.log(`Overall: ${summary.average}/100\n`);
  console.table(
    summary.pages.map(({ page, average, performance, accessibility, bestPractices, seo }) => ({
      page,
      average,
      performance,
      accessibility,
      bestPractices,
      seo,
    })),
  );
  console.log(`\nReports: ${outputDir}`);
}

function renderMarkdownSummary(summary) {
  const generatedAt = new Date(summary.generatedAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const rows = summary.pages
    .map(
      (row) =>
        `| ${row.page} | ${row.average} | ${row.performance} | ${row.accessibility} | ${row.bestPractices} | ${row.seo} | ${priority(row)} |`,
    )
    .join('\n');
  const weakPages = summary.pages
    .filter((row) => row.performance < 80 || row.accessibility < 95 || row.seo < 90 || row.bestPractices < 95)
    .map((row) => `- ${row.page}: ${priority(row)}`)
    .join('\n');

  return `# Site Quality Report

Generated: ${generatedAt}
Base URL: ${summary.baseUrl}
Overall score: ${summary.average}/100

| Page | Average | Performance | Accessibility | Best Practices | SEO | Priority |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
${rows}

## Next Priorities

${weakPages || '- No urgent page-level quality issues.'}
`;
}

function priority(row) {
  if (row.accessibility < 95) {
    return 'Fix accessibility regressions first';
  }
  if (row.seo < 90) {
    return 'Fix SEO metadata and crawlability';
  }
  if (row.bestPractices < 95) {
    return 'Review browser and security best-practice warnings';
  }
  if (row.performance < 70) {
    return 'Reduce main-thread work and first-screen hydration';
  }
  if (row.performance < 80) {
    return 'Keep improving first-screen speed';
  }
  return 'Healthy';
}

async function assertServerReady(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error(`Site is not reachable at ${url}. Start the web app first: corepack pnpm --filter @3s-design/web dev`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
