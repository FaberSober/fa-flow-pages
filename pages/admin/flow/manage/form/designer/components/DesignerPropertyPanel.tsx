import { DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Button, DatePicker, Divider, Empty, Form, Input, InputNumber, Select, Switch, Typography } from 'antd';
import dayjs from 'dayjs';
import type { DesignerItem } from '../model';
import { getControlLabel, getDesignerOptions } from '../model';

interface DesignerPropertyPanelProps {
  item?: DesignerItem;
  onChange: (patch: Partial<DesignerItem>) => void;
  onDelete: () => void;
}

export default function DesignerPropertyPanel({ item, onChange, onDelete }: DesignerPropertyPanelProps) {
  if (!item) {
    return (
      <aside aria-label="控件属性" style={{ height: '100%', overflow: 'auto', padding: 16 }}>
        <Typography.Text strong>属性面板</Typography.Text>
        <Divider style={{ margin: '16px 0' }} />
        <Empty
          image={<InfoCircleOutlined style={{ color: 'var(--ant-color-text-quaternary)', fontSize: 32 }} />}
          description="选择画布中的控件后，可在这里设置属性"
        />
      </aside>
    );
  }

  const update = (patch: Partial<DesignerItem>) => onChange(patch);
  const choiceOptions = item.kind === 'field' ? getDesignerOptions(item).map((option) => ({ label: option, value: option })) : [];

  function renderDefaultValue() {
    if (!item || item.kind !== 'field') return null;
    if (item.control === 'number') {
      const value = item.defaultValue.trim() === '' ? null : Number(item.defaultValue);
      return <InputNumber style={{ width: '100%' }} value={value !== null && Number.isFinite(value) ? value : null}
        onChange={(value) => update({ defaultValue: value == null ? '' : String(value) })} placeholder="不设置默认值" />;
    }
    if (item.control === 'date') {
      const value = item.defaultValue ? dayjs(item.defaultValue) : null;
      return <DatePicker style={{ width: '100%' }} value={value?.isValid() ? value : null}
        onChange={(value) => update({ defaultValue: value?.format('YYYY-MM-DD') ?? '' })} placeholder="不设置默认日期" />;
    }
    if (item.control === 'singleSelect' || item.control === 'multiSelect') {
      const multiple = item.control === 'multiSelect';
      return <Select allowClear style={{ width: '100%' }} mode={multiple ? 'multiple' : undefined} options={choiceOptions}
        value={multiple ? item.defaultValue.split(/[,，\n]/).map((value) => value.trim()).filter(Boolean) : item.defaultValue || undefined}
        onChange={(value: string | string[] | undefined) => update({ defaultValue: Array.isArray(value) ? value.join(',') : value ?? '' })}
        placeholder={choiceOptions.length ? '请选择默认选项' : '先填写下方选项'} />;
    }
    return item.control === 'textarea'
      ? <Input.TextArea rows={3} value={item.defaultValue} onChange={(event) => update({ defaultValue: event.target.value })} />
      : <Input value={item.defaultValue} onChange={(event) => update({ defaultValue: event.target.value })} />;
  }

  return (
    <aside aria-label="控件属性" style={{ height: '100%', overflow: 'auto', padding: 16 }}>
      <Typography.Text strong>属性面板</Typography.Text>
      <Divider style={{ margin: '16px 0' }} />
      <Form layout="vertical">
        <Form.Item label={item.kind === 'field' ? '字段名称' : item.control === 'group' ? '分组标题' : '说明内容'}>
          <Input value={item.label} onChange={(event) => update({ label: event.target.value })} maxLength={120} />
        </Form.Item>
        {item.kind === 'field' && (
          <>
            <Form.Item label="控件类型">
              <Input value={getControlLabel(item.control)} disabled />
            </Form.Item>
            <Form.Item label="必填">
              <Switch checked={item.required} onChange={(required) => update({ required })} />
            </Form.Item>
            <Form.Item label="默认值" extra="选填；填写表单时会自动带入">
              {renderDefaultValue()}
            </Form.Item>
            {(item.control === 'singleSelect' || item.control === 'multiSelect') && (
              <Form.Item label="选项" extra="每行填写一个选项">
                <Input.TextArea
                  rows={5}
                  value={item.options.join('\n')}
                  onChange={(event) =>
                    update({
                      options: event.target.value.split(/\r?\n/),
                    })
                  }
                />
              </Form.Item>
            )}
          </>
        )}
      </Form>
      <Button danger block icon={<DeleteOutlined />} onClick={onDelete}>
        删除控件
      </Button>
    </aside>
  );
}
