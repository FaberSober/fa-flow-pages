/** 切换单选/多选时同步默认值形状，保留第一个已选值。 */
export function convertChoiceDefault(value: string | number | (string | number)[] | null | undefined, multiple: boolean) {
  if (multiple) return Array.isArray(value) ? [...value] : value == null || value === '' ? [] : [value];
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

/** 多选字段在数据库中存储为 JSON 文本，控件需要数组。 */
export function parseStoredChoiceValues(value: unknown): (string | number)[] {
  if (Array.isArray(value)) return [...value];
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string' || typeof item === 'number') : [];
  } catch {
    return [];
  }
}
