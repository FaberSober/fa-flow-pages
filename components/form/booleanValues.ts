/** 兼容 MySQL 的 0/1 与 PostgreSQL 的布尔值，避免 Boolean('0') 误判。 */
export function toBooleanFormValue(value: unknown): boolean {
  return value === true || value === 1 || (typeof value === 'string' && ['1', 'true', 't'].includes(value.toLowerCase()));
}
