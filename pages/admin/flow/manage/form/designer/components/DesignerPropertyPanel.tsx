import { DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Button, Divider, Empty, Form, Input, Switch, Typography } from 'antd';
import type { DesignerItem } from '../model';
import { getControlLabel } from '../model';

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
            <Form.Item label="默认值" extra={item.control === 'multiSelect' ? '多个选项用逗号分隔' : undefined}>
              <Input value={item.defaultValue} onChange={(event) => update({ defaultValue: event.target.value })} />
            </Form.Item>
            {(item.control === 'singleSelect' || item.control === 'multiSelect') && (
              <Form.Item label="选项" extra="每行填写一个选项">
                <Input.TextArea
                  rows={5}
                  value={item.options.join('\n')}
                  onChange={(event) =>
                    update({
                      options: event.target.value
                        .split(/\r?\n/)
                        .map((option) => option.trim())
                        .filter(Boolean),
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
