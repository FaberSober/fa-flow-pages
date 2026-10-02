import { Checkbox, Form, Input, InputNumber, Select } from 'antd';
import type { Flow } from '@/types';
import { hasLength, hasPrecision, MYSQL_TYPES, POSTGRE_TYPES } from './columnUtils';

interface ColumnFieldsProps {
  dataType: string;
  databaseType: Flow.TableInfoVo['databaseType'];
  editing?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
}

export default function ColumnFields({ dataType, databaseType, editing, primaryKey, autoIncrement }: ColumnFieldsProps) {
  const types = databaseType === 'mysql' ? MYSQL_TYPES : databaseType === 'postgre' ? POSTGRE_TYPES : [];
  const options = (dataType && !types.includes(dataType) ? [dataType, ...types] : types).map(value => ({ label: value, value }));
  return <>
    <Form.Item name="field" noStyle rules={editing ? [] : [{ required: true, message: '请输入业务字段名' }, { pattern: /^[a-z][a-z0-9_]*$/, message: '请使用小写英文、数字和下划线' }]}>
      <Input variant="filled" readOnly={editing} placeholder="customer_name" title={editing ? '本阶段不支持字段重命名' : '小写英文、数字和下划线'} />
    </Form.Item>
    <Form.Item name="comment" noStyle rules={[{ required: true, message: '请输入字段中文说明' }]}>
      <Input variant="filled" placeholder="客户名称" />
    </Form.Item>
    <Form.Item name="dataType" noStyle rules={[{ required: true, message: '请选择类型' }]}>
      <Select options={options} placeholder="字段类型" />
    </Form.Item>
    <div className="fa-db-column-params">
      {hasLength(dataType) && <Form.Item name="length" noStyle rules={[{ required: true, message: '请输入长度' }]}><InputNumber min={1} precision={0} placeholder="长度" /></Form.Item>}
      {hasPrecision(dataType) && <>
        <Form.Item name="precision" noStyle rules={[{ required: true, message: '请输入精度' }]}><InputNumber min={1} max={databaseType === 'mysql' ? 65 : 1000} precision={0} placeholder="精度" title="数字总位数" /></Form.Item>
        <Form.Item name="scale" noStyle rules={[{ required: true, message: '请输入小数位' }]}><InputNumber min={0} precision={0} placeholder="小数位" title="小数位数" /></Form.Item>
      </>}
      {!hasLength(dataType) && !hasPrecision(dataType) && <span className="fa-text-secondary">—</span>}
    </div>
    <Form.Item name="nullable" valuePropName="checked" noStyle><Checkbox disabled={primaryKey} /></Form.Item>
    <Form.Item name="defaultValue" noStyle><Input variant="filled" disabled={databaseType === 'mysql' && ['text', 'json'].includes(dataType)} placeholder="留空表示无默认值" title={['datetime', 'timestamp'].includes(dataType) ? '可填写 CURRENT_TIMESTAMP；留空表示无默认值' : '固定值；日期格式 YYYY-MM-DD；留空表示无默认值'} /></Form.Item>
    <span className="fa-text-secondary">{primaryKey ? autoIncrement ? '主键 · 自增' : '主键' : '—'}</span>
  </>;
}
