import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = await readFile(new URL('./temporalValues.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const resolved = outputText.replace("from 'dayjs'", `from '${pathToFileURL(require.resolve('dayjs')).href}'`);
const { toTemporalValue, formatTemporalValue, serializeFormTemporalValues } = await import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`);

test('date and time defaults round trip without adding a date to time values', () => {
  assert.equal(formatTemporalValue('datepicker', '2026-10-03'), '2026-10-03');
  assert.equal(formatTemporalValue('timepicker', '09:30:00'), '09:30:00');
  assert.equal(formatTemporalValue('timepicker', '09:30'), '09:30:00');
  assert.equal(formatTemporalValue('timepicker', '2026-10-03 09:30:00'), '09:30:00');
  assert.equal(toTemporalValue('timepicker', null), undefined);
  assert.equal(toTemporalValue('datepicker', ''), undefined);
});

test('nested containers and untouched subtable temporal values submit strings and preserve records', () => {
  const items = [{ type: 'container_row', children: [
    { type: 'datepicker', name: 'order_date' },
    { type: 'timepicker', name: 'delivery_time' },
    { type: 'high_subtable', name: 'goods', children: [
      { type: 'datepicker', name: 'goods_date' }, { type: 'timepicker', name: 'goods_time' },
    ] },
  ] }];
  const values = { order_date: toTemporalValue('datepicker', '2026-10-03'), delivery_time: undefined,
    goods: [{ id: 5, goods_date: toTemporalValue('datepicker', '2026-10-04'), goods_time: toTemporalValue('timepicker', '08:15:00'), goods_num: 2 }] };
  assert.deepEqual(serializeFormTemporalValues(items, values), { order_date: '2026-10-03', delivery_time: null,
    goods: [{ id: 5, goods_date: '2026-10-04', goods_time: '08:15:00', goods_num: 2 }] });
  assert.equal(typeof values.goods[0].goods_date.format, 'function');
  assert.equal(serializeFormTemporalValues([{ type: 'timepicker', name: 'missing' }], {}).missing, undefined);
});
