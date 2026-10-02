import { flowFormApi } from '@/services';
import type { Flow } from '@/types';
import { Fa, FaUtils, useApiLoading } from '@fa/ui';
import { Button, Form, message } from 'antd';
import { useRef, useState } from 'react';
import ColumnFields from './ColumnFields';
import { typeParameters, toColumn, type ColumnValues } from './columnUtils';

export interface FormTableColumnAddProps {
  tableName: string;
  databaseType: Flow.TableInfoVo['databaseType'];
  onSuccess?: () => Promise<void>;
}

export default function FormTableColumnAdd({ tableName, databaseType, onSuccess }: FormTableColumnAddProps) {
  const [form] = Form.useForm<ColumnValues>();
  const [dataType, setDataType] = useState('varchar');
  const busy = useRef(false);
  const loading = useApiLoading(flowFormApi.getUrl('createColumn'));

  async function onFinish(values: ColumnValues) {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await flowFormApi.createColumn({ tableName, column: toColumn(values) });
      if (res.status !== Fa.RES_CODE.OK) { message.error(res.message || '新增字段失败'); return; }
      FaUtils.showResponse(res, '新增字段');
      form.resetFields();
      setDataType('varchar');
      await onSuccess?.();
    } catch { /* 请求层及同步层提示错误；失败保留输入 */ }
    finally { busy.current = false; }
  }

  return <Form form={form} onFinish={onFinish} onFinishFailed={({ errorFields }) => message.warning(errorFields[0]?.errors[0] || '请检查字段设置')} disabled={loading || !databaseType}
    initialValues={{ nullable: false, dataType: 'varchar', length: 255 }}
    onValuesChange={changed => {
      if (changed.dataType) {
        setDataType(changed.dataType);
        form.setFieldsValue({ ...typeParameters(changed.dataType), defaultValue: undefined });
      }
    }}>
    <div className="fa-db-column-row fa-db-column-add">
      <ColumnFields dataType={dataType} databaseType={databaseType} />
      <div><Button type="primary" htmlType="submit" loading={loading}>添加字段</Button></div>
      <span />
    </div>
  </Form>;
}
