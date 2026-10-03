import { DatePicker, Form, TimePicker } from 'antd';
import { formatTemporalValue, toTemporalValue } from '../../temporalValues';

export default function FormItemTemporalProperty({ type }: { type: 'datepicker' | 'timepicker' }) {
  return <Form.Item name="initialValue" label="默认值"
    getValueProps={value => ({ value: toTemporalValue(type, value) })}
    normalize={value => formatTemporalValue(type, value)}>
    {type === 'datepicker'
      ? <DatePicker style={{ width: '100%' }} allowClear />
      : <TimePicker style={{ width: '100%' }} allowClear />}
  </Form.Item>;
}
