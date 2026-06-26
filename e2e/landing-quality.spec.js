import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { playAudit } from 'playwright-lighthouse';
import { lighthouseTest } from './fixtures/lighthouse.js';

const LIGHTHOUSE_THRESHOLDS = {
  performance: 100,
  accessibility: 100,
  'best-practices': 100,
  seo: 100,
};

test.describe('Landing page accessibility', () => {
  test('has no axe violations on visible landing content', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .include('#landing')
      .include('header')
      .include('footer')
      .analyze();

    expect(results.violations, formatAxeViolations(results.violations)).toEqual([]);
  });

  test('skip link targets main content', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main');
    await expect(page.locator('#main')).toBeAttached();
  });

  test('interactive controls have accessible names', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: /toggle color theme/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /start preflight/i })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Footer' })).toBeVisible();
  });
});

test.describe('Landing page SEO', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('document language and viewport are set', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      /width=device-width/i,
    );
    await expect(page.locator('meta[charset], meta[charset="UTF-8"]')).toHaveCount(1);
  });

  test('title and meta description are descriptive', async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThanOrEqual(10);
    expect(title.length).toBeLessThanOrEqual(70);
    await expect(page).toHaveTitle(/Call Preflight.*camera.*mic/i);

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /camera.*microphone/i);
    const descriptionText = await description.getAttribute('content');
    expect(descriptionText.length).toBeGreaterThanOrEqual(50);
    expect(descriptionText.length).toBeLessThanOrEqual(320);
  });

  test('indexing, canonical, and social meta tags are present', async ({ page }) => {
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://callpreflight.app/',
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Call Preflight/i);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://callpreflight.app/',
    );
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      'content',
      'Call Preflight',
    );
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      'content',
      /camera|voice|call/i,
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://callpreflight.app/og-image.svg',
    );
  });

  test('structured data describes the web application', async ({ page }) => {
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);

    const schema = JSON.parse(await jsonLd.textContent());
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('WebApplication');
    expect(schema.name).toBe('Call Preflight');
    expect(schema.url).toBe('https://callpreflight.app/');
    expect(schema.description).toMatch(/camera|microphone|WebRTC/i);
  });

  test('headings follow a logical outline', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: /preflight your video call/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /what you can check/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /how it works/i })).toBeVisible();
  });

  test('footer links are crawlable', async ({ page }) => {
    const footer = page.getByRole('navigation', { name: 'Footer' });
    await expect(footer.getByRole('link', { name: /privacy/i })).toHaveAttribute('href', '/privacy.html');
    await expect(footer.getByRole('link', { name: /contact/i })).toHaveAttribute('href', '/contact.html');
  });

  test('favicon is linked', async ({ page }) => {
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  });

  test('robots.txt allows crawling', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('body')).toContainText(/User-agent:\s*\*/i);
    await expect(page.locator('body')).toContainText(/Allow:\s*\//i);
  });
});

lighthouseTest.describe('Landing page Lighthouse', () => {
  lighthouseTest('scores 100 for performance, accessibility, best practices, and SEO', async ({
    page,
    port,
  }) => {
    await page.goto('/');

    await playAudit({
      page,
      port,
      thresholds: LIGHTHOUSE_THRESHOLDS,
      reports: {
        formats: { html: true, json: true },
        name: 'landing',
        directory: `${process.cwd()}/e2e/lighthouse-reports`,
      },
    });
  });
});

function formatAxeViolations(violations) {
  if (violations.length === 0) return '';

  return violations
    .map((violation) => {
      const nodes = violation.nodes.map((node) => node.html).join('\n  ');
      return `${violation.id}: ${violation.description}\n  ${nodes}`;
    })
    .join('\n\n');
}
