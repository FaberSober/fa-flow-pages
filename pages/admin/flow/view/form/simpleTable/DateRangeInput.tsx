import { DatePicker, Space } from 'antd';
import { toTemporalValue } from '@features/fa-flow-pages/components/form/temporalValues';

/** 表单值保持日期字符串，可分别清空起止日期。 */
export default function DateRangeInput({ value, onChange }: {
  value?: (string | null)[];
  onChange?: (value: (string | null)[]) => void;
}) {
  return <Space.Compact>
    <DatePicker value={toTemporalValue('datepicker', value?.[0])} placeholder="开始日期" style={{ width: 140 }}
      onChange={date => onChange?.([date?.format('YYYY-MM-DD') ?? null, value?.[1] ?? null])} />
    <DatePicker value={toTemporalValue('datepicker', value?.[1])} placeholder="结束日期" style={{ width: 140 }}
      onChange={date => onChange?.([value?.[0] ?? null, date?.format('YYYY-MM-DD') ?? null])} />
  </Space.Compact>;
}
