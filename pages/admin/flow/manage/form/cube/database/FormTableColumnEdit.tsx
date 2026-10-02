import type { Flow } from '@/types';
import { Button, Form, Popconfirm, Space, Tag, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { flowFormApi } from '@/services';
import { Fa, FaUtils, useApiLoading } from '@fa/ui';
import ColumnFields from './ColumnFields';
import { isSystemColumn, typeParameters, toColumn, type ColumnValues } from './columnUtils';

export interface FormTableColumnEditProps {
  column: Flow.TableColumnVo;
  tableName: string;
  databaseType: Flow.TableInfoVo['databaseType'];
  onSuccess?: () => Promise<void>;
}

export default function FormTableColumnEdit({ column, tableName, databaseType, onSuccess }: FormTableColumnEditProps) {
  const [form] = Form.useForm<ColumnValues>();
  const [dataType, setDataType] = useState(column.dataType);
  const busy = useRef(false);
  const loading = useApiLoading([flowFormApi.getUrl('updateColumn'), flowFormApi.getUrl('deleteColumn')]);
  const system = isSystemColumn(column);
  const unsupported = Boolean(column.defaultExpression || column.key === 'PRI' || column.extra === 'auto_increment' || /unsigned/i.test(column.type));
  const readOnlyReason = column.defaultExpression ? '默认表达式暂不支持编辑' : '主键、自增或 unsigned 字段暂不支持编辑';
  useEffect(() => {
    setDataType(column.dataType);
    form.resetFields();
    form.setFieldsValue({ ...column, nullable: column.nullable === 'NO', defaultValue: column.defaultValue ?? '' });
  }, [column, tableName, form]);

  async function onFinish(values: ColumnValues) {
    if (busy.current || unsupported) return;
    busy.current = true;
    try {
      const res = await flowFormApi.updateColumn({ tableName, column: { ...toColumn(values), field: column.field, key: column.key, extra: column.extra } });
      if (res.status !== Fa.RES_CODE.OK) { message.error(res.message || '更新字段失败'); return; }
      FaUtils.showResponse(res, '更新字段');
      await onSuccess?.();
    } catch { /* 请求层提示；失败保留输入 */ }
    finally { busy.current = false; }
  }

  async function remove() {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await flowFormApi.deleteColumn({ tableName, column: column.field });
      if (res.status !== Fa.RES_CODE.OK) { message.error(res.message || '删除字段失败'); return; }
      FaUtils.showResponse(res, '删除字段');
      await onSuccess?.();
    } catch { /* 请求层提示 */ }
    finally { busy.current = false; }
  }

  if (system) return <div className="fa-db-column-row fa-db-system-row">
    <span>{column.field}</span><span>{column.comment || '—'}</span><span>{column.dataType}</span>
    <span>{column.type}</span><span>{column.nullable === 'NO' ? '是' : '否'}</span>
    <span>{column.defaultValue ?? '—'}</span><span>{column.key === 'PRI' ? column.extra === 'auto_increment' ? '主键 · 自增' : '主键' : '—'}</span>
    <Tag>系统维护</Tag><span />
  </div>;

  return <Form form={form} onFinish={onFinish} onFinishFailed={({ errorFields }) => message.warning(errorFields[0]?.errors[0] || '请检查字段设置')} disabled={loading || !databaseType || unsupported} style={{ flex: 1 }}
    onValuesChange={changed => {
      if (changed.dataType) { setDataType(changed.dataType); form.setFieldsValue({ ...typeParameters(changed.dataType), defaultValue: undefined }); }
    }}>
    <div className="fa-db-column-row">
      <ColumnFields dataType={dataType} databaseType={databaseType} editing primaryKey={column.key === 'PRI'} autoIncrement={column.extra === 'auto_increment'} />
      <Space size={0}>
        <Button type="link" htmlType="submit" loading={loading} title={unsupported ? readOnlyReason : undefined}>更新</Button>
        <Popconfirm title="确定删除该字段吗？" description="删除后字段数据不可恢复" okButtonProps={{ danger: true }} okText="删除" onConfirm={remove} disabled={loading || !databaseType}>
          <Button type="link" danger disabled={loading || !databaseType}>删除</Button>
        </Popconfirm>
      </Space>
    </div>
    {unsupported && <div className="fa-text-secondary" style={{ padding: '0 8px 6px' }}>{readOnlyReason}</div>}
  </Form>;
}
