import { Form, Input, InputNumber } from 'antd';
import type { Flow } from '@/types';

/**
 * @author xu.pengfei
 * @date 2025-12-27 09:34:16
 */
export default function FormItemInputProperty({ type }: { type?: Flow.FlowFormItemType }) {
  return (
    <div>
      <Form.Item name="placeholder" label="占位符" rules={[{ required: false }]}>
        <Input />
      </Form.Item>
      {(type === 'input' || type === 'textarea') && <Form.Item name="textMaxLength" label="最大字数">
        <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="留空不限制" />
      </Form.Item>}
      {type === 'textarea' && <Form.Item name="textRows" label="显示行数">
        <InputNumber min={2} max={12} precision={0} style={{ width: '100%' }} placeholder="留空使用原行数" />
      </Form.Item>}
    </div>
  );
}
