import { flowFormTableApi } from '@features/fa-flow-pages/services';
import { Fa, FaUtils } from '@fa/ui';
import { Alert, Button, Checkbox, Empty, Modal, Select, Space, Tag, message } from 'antd';
import { useRef, useState } from 'react';
import { appendSourceFields, getBoundFields, getBusinessColumns, getColumnControlType, type FormFieldSource } from '../fieldGeneration';
import { useFaFormStore } from '../stores/useFaFormStore';

export default function FormFieldGenerateModal() {
  const flowForm = useFaFormStore((state) => state.flowForm);
  const config = useFaFormStore((state) => state.config);
  const updateFormItems = useFaFormStore((state) => state.updateFormItems);
  const requestId = useRef(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<FormFieldSource[]>([]);
  const [tableName, setTableName] = useState<string>();
  const [fields, setFields] = useState<string[]>([]);
  const source = sources.find((item) => item.tableName === tableName);
  const bound = source ? getBoundFields(config.items || [], source) : new Set<string>();
  const columns = source ? getBusinessColumns(source) : [];

  function selectSource(next: FormFieldSource) {
    setTableName(next.tableName);
    const used = getBoundFields(useFaFormStore.getState().config.items || [], next);
    setFields(
      getBusinessColumns(next)
        .filter((column) => getColumnControlType(column) && !used.has(column.field))
        .map((column) => column.field),
    );
  }

  async function handleOpen() {
    const main = flowForm.dataConfig?.main;
    if (!main?.columns?.length) {
      message.warning('请先在数据库表步骤同步主表结构');
      return;
    }
    const request = ++requestId.current;
    setOpen(true);
    setLoading(true);
    setSources([]);
    setFields([]);
    try {
      const res = await flowFormTableApi.list({ query: { flowFormId: flowForm.id }, sorter: 'sort asc' });
      if (request !== requestId.current) return;
      if (res.status !== Fa.RES_CODE.OK) {
        message.error(res.message || '加载关联子表失败');
        return;
      }
      const next: FormFieldSource[] = [{ tableName: main.tableName, label: main.comment || main.tableName, columns: main.columns }];
      for (const table of res.data || []) {
        if (!table.foreignKey || !table.referenceKey || !table.dataConfig?.columns?.length) continue;
        next.push({
          tableName: table.tableName,
          label: table.remark || table.tableName,
          columns: table.dataConfig.columns,
          foreignKey: table.foreignKey,
          subtable: true,
        });
      }
      setSources(next);
      selectSource(next[0]);
    } catch {
      if (request === requestId.current) message.error('加载字段失败，请重试');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }

  return (
    <>
      <Button size="small" onClick={handleOpen}>
        从数据表添加字段
      </Button>
      <Modal
        title="从数据表添加业务字段"
        open={open}
        onCancel={() => {
          ++requestId.current;
          setOpen(false);
        }}
        confirmLoading={loading}
        okText="添加到表单"
        okButtonProps={{ disabled: loading || !source || fields.length === 0 }}
        onOk={() => {
          if (!source) return;
          const latest = useFaFormStore.getState().config.items || [];
          updateFormItems(appendSourceFields(latest, source, fields, () => FaUtils.uuid()));
          setOpen(false);
        }}
      >
        <Alert
          type="info"
          showIcon
          message="使用已同步的字段结构；已有控件保留，系统字段和子表关联外键自动排除。"
          description="新增或修改字段后，请先在数据库表步骤同步到配置。子表还需配置外键和关联主键。"
          className="fa-mb12"
        />
        <Select
          style={{ width: '100%' }}
          loading={loading}
          disabled={loading}
          value={tableName}
          options={sources.map((item) => ({ value: item.tableName, label: `${item.label}（${item.tableName} · ${item.subtable ? '子表' : '主表'}）` }))}
          onChange={(value) => {
            const next = sources.find((item) => item.tableName === value);
            if (next) selectSource(next);
          }}
        />
        <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
          {columns.map((column) => {
            const used = bound.has(column.field);
            const supported = Boolean(getColumnControlType(column));
            return (
              <Checkbox
                key={column.field}
                disabled={used || !supported}
                checked={fields.includes(column.field)}
                onChange={(event) =>
                  setFields((current) => (event.target.checked ? [...current, column.field] : current.filter((field) => field !== column.field)))
                }
              >
                {column.comment || column.field}{' '}
                <span style={{ color: 'var(--fa-text-color)' }}>
                  {column.field} · {column.type}
                </span>
                {used && <Tag>已绑定</Tag>}
                {!supported && <Tag>请手动配置控件</Tag>}
              </Checkbox>
            );
          })}
          {!loading && columns.length === 0 && <Empty description="暂无可添加的业务字段" />}
        </Space>
      </Modal>
    </>
  );
}
