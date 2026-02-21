import { useQuery, UseQueryResult } from '@tanstack/react-query';
import axios from 'axios';

const PROMPTFOO_BLOG_URL =
  import.meta.env.VITE_PROMPTFOO_SAFETY_DATASETS_URL ||
  'https://www.promptfoo.dev/blog/top-llm-safety-bias-benchmarks/';

export interface SafetyDatasetLink {
  label: string;
  url: string;
}

export interface SafetyDataset {
  rank: number;
  title: string;
  slug: string;
  summary: string;
  url: string;
  tags: string[];
  links: SafetyDatasetLink[];
}

function normalizeUrl(href: string): string {
  if (!href) return href;
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('/')) return `https://www.promptfoo.dev${href}`;
  return href;
}

function tagsForRank(rank: number): string[] {
  switch (rank) {
    case 1:
    case 2:
    case 3:
      return ['toxicity'];
    case 4:
    case 5:
    case 6:
      return ['bias'];
    case 7:
      return ['truthfulness'];
    case 8:
      return ['alignment'];
    case 9:
      return ['adversarial'];
    case 10:
      return ['prosocial'];
    default:
      return [];
  }
}

async function fetchSafetyDatasets(): Promise<SafetyDataset[]> {
  const response = await axios.get<string>(PROMPTFOO_BLOG_URL, {
    timeout: 30000,
    responseType: 'text',
    headers: { Accept: 'text/html' },
  });

  const doc = new DOMParser().parseFromString(response.data, 'text/html');
  const h2s = Array.from(doc.querySelectorAll('h2[id]'));

  const datasets: SafetyDataset[] = [];

  for (const h2 of h2s) {
    const raw = (h2.textContent || '').replace(/\u200b/g, '').trim();
    const m = raw.match(/^(\d+)\.\s+(.*)$/);
    if (!m) continue;

    const rank = Number(m[1]);
    const title = (m[2] || '').trim();
    const slug = h2.getAttribute('id') || '';
    const url = `${PROMPTFOO_BLOG_URL.replace(/\/$/, '')}/#${slug}`;

    let summary = '';
    let cursor: Element | null = h2.nextElementSibling;
    while (cursor && cursor.tagName !== 'H2') {
      if (cursor.tagName === 'P') {
        summary = (cursor.textContent || '').trim();
        break;
      }
      cursor = cursor.nextElementSibling;
    }

    const links: SafetyDatasetLink[] = [];
    cursor = h2.nextElementSibling;
    while (cursor && cursor.tagName !== 'H2') {
      const anchors = Array.from(cursor.querySelectorAll('a[href]'));
      for (const a of anchors) {
        const href = normalizeUrl(a.getAttribute('href') || '');
        if (!href || href.startsWith('#')) continue;

        // Prefer canonical links, skip repeated navigation hash-links.
        if (a.classList.contains('hash-link')) continue;

        const label = (a.textContent || '').trim() || href;
        if (links.some((l) => l.url === href)) continue;

        // Keep the list short and useful.
        const isHF = href.includes('huggingface.co/datasets');
        const isPaper = href.includes('arxiv.org') || href.includes('aclanthology.org');
        const keep = isHF || isPaper;
        if (!keep) continue;

        links.push({ label, url: href });
        if (links.length >= 3) break;
      }
      if (links.length >= 3) break;
      cursor = cursor.nextElementSibling;
    }

    datasets.push({
      rank,
      title,
      slug,
      summary,
      url,
      tags: tagsForRank(rank),
      links,
    });
  }

  datasets.sort((a, b) => a.rank - b.rank);
  return datasets;
}

export function useSafetyDatasets(): UseQueryResult<SafetyDataset[]> {
  return useQuery({
    queryKey: ['promptfoo-safety-datasets', PROMPTFOO_BLOG_URL],
    queryFn: fetchSafetyDatasets,
    staleTime: 12 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
