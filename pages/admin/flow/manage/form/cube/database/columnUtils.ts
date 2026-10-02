import type { Flow } from '@/types';

export const SYSTEM_FIELDS = ['id', 'flow_instance_id', 'tenant_id', 'crt_time', 'crt_user', 'upd_time', 'upd_user', 'deleted'];
export const isSystemColumn = (column: Flow.TableColumnVo) => SYSTEM_FIELDS.includes(column.field.toLowerCase());
export const hasLength = (type: string) => ['varchar', 'char'].includes(type);
export const hasPrecision = (type: string) => ['decimal', 'numeric'].includes(type);
export const MYSQL_TYPES = ['varchar', 'char', 'text', 'int', 'bigint', 'smallint', 'tinyint', 'decimal', 'float', 'double', 'date', 'datetime', 'timestamp', 'json'];
export const POSTGRE_TYPES = ['varchar', 'char', 'text', 'int', 'bigint', 'smallint', 'numeric', 'decimal', 'real', 'double precision', 'date', 'timestamp', 'boolean', 'json', 'jsonb'];

export function typeParameters(type: string) {
  return { length: hasLength(type) ? 255 : undefined, precision: hasPrecision(type) ? 18 : undefined, scale: hasPrecision(type) ? 2 : undefined };
}

export interface ColumnValues {
  field: string;
  dataType: string;
  length?: number | null;
  precision?: number | null;
  scale?: number | null;
  nullable: boolean;
  defaultValue?: string;
  comment: string;
}

export function toColumn(values: ColumnValues) {
  return {
    type: values.dataType,
    key: '',
    extra: '',
    ...values,
    length: hasLength(values.dataType) ? values.length ?? null : null,
    precision: hasPrecision(values.dataType) ? values.precision ?? null : null,
    scale: hasPrecision(values.dataType) ? values.scale ?? null : null,
    nullable: values.nullable ? 'NO' : 'YES',
    defaultValue: values.defaultValue === '' || values.defaultValue == null ? null : values.defaultValue,
  };
}

/** 只替换业务字段的位置，始终保留完整系统字段及其原位置。 */
export function mergeBusinessColumns(all: Flow.TableColumnVo[], business: Flow.TableColumnVo[]) {
  let index = 0;
  return all.map(column => isSystemColumn(column) ? column : business[index++]);
}
