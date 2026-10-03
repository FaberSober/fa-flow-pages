import { Alert, Form, InputNumber } from 'antd';

/** 数字控件的输入范围和精度，留空使用组件默认行为。 */
export default function FormItemNumberProperty() {
  const form = Form.useFormInstance();
  const min = Form.useWatch('numberMin', form);
  const max = Form.useWatch('numberMax', form);
  return <>
    <Form.Item name="numberMin" label="最小值">
      <InputNumber style={{ width: '100%' }} placeholder="留空不限制" />
    </Form.Item>
    <Form.Item name="numberMax" label="最大值">
      <InputNumber style={{ width: '100%' }} placeholder="留空不限制" />
    </Form.Item>
    <Form.Item name="numberPrecision" label="小数位">
      <InputNumber min={0} max={8} precision={0} style={{ width: '100%' }} placeholder="留空自动；数量可设为 0" />
    </Form.Item>
    <Form.Item name="numberStep" label="步长">
      <InputNumber min={0.00000001} style={{ width: '100%' }} placeholder="留空为 1；价格可设为 0.01" />
    </Form.Item>
    {min != null && max != null && max < min && <Alert type="warning" showIcon title="最大值应不小于最小值，调整前暂不应用最大值限制" />}
    <div className="fa-text-secondary">用于填报输入，数据库类型和精度仍以数据表为准。</div>
  </>;
}
