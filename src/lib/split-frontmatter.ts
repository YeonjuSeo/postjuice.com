import { parse as parseYaml } from 'yaml';

export type FrontmatterSplit = {
  data: Record<string, unknown>;
  content: string;
};

/**
 * --- YAML --- 본문 형식만 지원합니다. gray-matter(eval) 대신 브라우저/CSP 환경에서도 동작하도록 합니다.
 */
export function splitFrontmatter(raw: string): FrontmatterSplit {
  const text = raw.replace(/^\uFEFF/, '');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/m.exec(text);

  if (!match) {
    return { data: {}, content: text };
  }

  const yamlBlock = match[1] ?? '';
  const body = match[2] ?? '';

  try {
    const parsed = parseYaml(yamlBlock);
    const data =
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    return { data, content: body };
  } catch {
    return { data: {}, content: text };
  }
}
