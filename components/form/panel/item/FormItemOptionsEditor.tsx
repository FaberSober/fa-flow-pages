import { Button, Input, InputNumber, Select, Space } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { Flow } from '@/types';

type Options = NonNullable<Flow.FlowFormItem['options']>;

export interface FormItemOptionsEditorProps {
  value?: Options;
  onChange?: (value: Options) => void;
}

/** 在属性面板内直接维护选项，显示名称与存储值分离。 */
export default function FormItemOptionsEditor({ value = [], onChange }: FormItemOptionsEditorProps) {
  function update(index: number, patch: Partial<Options[number]>) {
    onChange?.(value.map((option, position) => position === index ? { ...option, ...patch } : option));
  }

  function addOption() {
    let index = value.length + 1;
    while (value.some(option => option.value === `option_${index}`)) index += 1;
    onChange?.([...value, { label: `选项${index}`, value: `option_${index}` }]);
  }

  return <div className="fa-flex-column fa-gap6">
    {value.map((option, index) => <div key={index} className="fa-flex-column fa-gap6 fa-border-b fa-pb6">
      <Space.Compact style={{ width: '100%' }}>
        <Input value={option.label} placeholder="显示名称，如待付款" onChange={event => update(index, { label: event.target.value })} />
        <Button danger icon={<DeleteOutlined />} aria-label={`删除选项${index + 1}`} onClick={() => onChange?.(value.filter((_, position) => position !== index))} />
      </Space.Compact>
      <Space.Compact style={{ width: '100%' }}>
        <Select value={typeof option.value === 'number' ? 'number' : 'string'} style={{ width: 85 }}
          options={[{ label: '文本', value: 'string' }, { label: '数字', value: 'number' }]}
          onChange={type => update(index, { value: type === 'number' ? 0 : String(option.value) })} />
        {typeof option.value === 'number'
          ? <InputNumber value={option.value} style={{ flex: 1 }} placeholder="存储值" onChange={next => update(index, { value: next ?? '' })} />
          : <Input value={option.value} placeholder="存储值，如 pending" onChange={event => update(index, { value: event.target.value })} />}
      </Space.Compact>
    </div>)}
    <Button onClick={addOption}>添加选项</Button>
    <div className="fa-text-secondary">名称用于显示，值保存到数据库；请使用不重复的值。修改选项不会迁移已有数据。</div>
  </div>;
}
