/** 字符串小数按四舍五入显示，避免金额转为浮点数后丢失精度。 */
export function formatNumberColumnValue(value: unknown, precision: number): string {
  if (value === null || value === undefined || value === '') return '—';
  const text = String(value);
  if (!Number.isInteger(precision) || precision < 0 || precision > 8) return text;
  let decimal = text.trim();
  const exponential = decimal.match(/^([+-]?)(\d+)(?:\.(\d*))?[eE]([+-]?\d+)$/);
  if (exponential) {
    const exponent = Number(exponential[4]);
    if (!Number.isInteger(exponent) || Math.abs(exponent) > 1000) return text;
    const digits = exponential[2] + (exponential[3] || '');
    const point = exponential[2].length + exponent;
    decimal = exponential[1] + (point <= 0 ? `0.${'0'.repeat(-point)}${digits}`
      : point >= digits.length ? digits + '0'.repeat(point - digits.length) : `${digits.slice(0, point)}.${digits.slice(point)}`);
  }
  const match = decimal.match(/^([+-]?)(\d+)(?:\.(\d*))?$/);
  if (!match) return text;
  const fraction = match[3] || '';
  let scaled = BigInt(match[2] + fraction.slice(0, precision).padEnd(precision, '0'));
  if ((fraction[precision] || '0') >= '5') scaled += 1n;
  const digits = scaled.toString().padStart(precision + 1, '0');
  const sign = match[1] === '-' && scaled !== 0n ? '-' : '';
  return precision === 0 ? sign + digits : `${sign}${digits.slice(0, -precision)}.${digits.slice(-precision)}`;
}

export function isNumericColumn(type: string) {
  return ['tinyint', 'smallint', 'mediumint', 'int', 'integer', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'double precision'].includes(type?.toLowerCase());
}
