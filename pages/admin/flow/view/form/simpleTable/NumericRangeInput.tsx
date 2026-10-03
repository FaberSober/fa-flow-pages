import { InputNumber, Space } from 'antd';

/** 两端可分别清空，空端不参与查询。 */
export default function NumericRangeInput({ value, onChange }: {
  value?: (string | number | null)[];
  onChange?: (value: (string | number | null)[]) => void;
}) {
  return <Space.Compact>
    <InputNumber stringMode value={value?.[0] ?? null} placeholder="最小值" style={{ width: 110 }}
      onChange={min => onChange?.([min, value?.[1] ?? null])} />
    <InputNumber stringMode value={value?.[1] ?? null} placeholder="最大值" style={{ width: 110 }}
      onChange={max => onChange?.([value?.[0] ?? null, max])} />
  </Space.Compact>;
}
