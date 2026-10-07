import { Fa, FaUtils } from '@fa/ui';
import { flowFormTableApi } from '@features/fa-flow-pages/services';
import { Alert, Button, Checkbox, Empty, Modal, message, Space, Spin, Tag, Typography } from 'antd';
import { useRef, useState } from 'react';
import { appendSourceFields, type FormFieldSource, getBoundFields, getBusinessColumns, getColumnControlType } from '../fieldGeneration';
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
  const mainSources = sources.filter((item) => !item.subtable);
  const subtableSources = sources.filter((item) => item.subtable);

  function selectSource(next: FormFieldSource) {
    if (next.disabledReason) return;
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
    const mainSource: FormFieldSource = {
      tableName: main.tableName,
      label: main.comment || main.tableName,
      columns: main.columns,
    };
    const request = ++requestId.current;
    setOpen(true);
    setLoading(true);
    setSources([mainSource]);
    selectSource(mainSource);
    try {
      const res = await flowFormTableApi.list({ query: { flowFormId: flowForm.id }, sorter: 'sort asc' });
      if (request !== requestId.current) return;
      if (res.status !== Fa.RES_CODE.OK) {
        message.error(res.message || '加载关联子表失败');
        return;
      }
      const next: FormFieldSource[] = [mainSource];
      for (const table of res.data || []) {
        const missing: string[] = [];
        if (!table.foreignKey) missing.push('配置外键');
        if (!table.referenceKey) missing.push('配置关联主键');
        if (!table.dataConfig?.columns?.length) missing.push('同步字段结构');
        next.push({
          tableName: table.tableName,
          label: table.remark || table.tableName,
          columns: table.dataConfig?.columns || [],
          foreignKey: table.foreignKey,
          subtable: true,
          disabledReason: missing.length ? `请先完成：${missing.join('、')}` : undefined,
        });
      }
      setSources(next);
      selectSource(mainSource);
    } catch {
      if (request === requestId.current) message.error('加载字段失败，请重试');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }

  function renderSource(item: FormFieldSource, typeLabel: string) {
    const selected = tableName === item.tableName;
    return (
      <div key={item.tableName} style={{ width: '100%' }}>
        <Button
          block
          type={selected ? 'primary' : 'default'}
          disabled={loading || Boolean(item.disabledReason)}
          aria-pressed={selected}
          onClick={() => selectSource(item)}
          style={{ height: 'auto', minHeight: 68, padding: '8px 10px', textAlign: 'left', whiteSpace: 'normal' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: 2, textAlign: 'left' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{item.label}</span>
              <span title={item.tableName} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, opacity: 0.75 }}>
                {item.tableName}
              </span>
            </div>
            <Tag color={selected ? 'blue' : undefined} style={{ marginInlineEnd: 0 }}>
              {typeLabel}
            </Tag>
          </div>
        </Button>
        {item.disabledReason && (
          <Typography.Text type="secondary" style={{ display: 'block', padding: '4px 8px 0', fontSize: 12 }}>
            <Tag color="warning">不可选</Tag>
            {item.disabledReason}
          </Typography.Text>
        )}
      </div>
    );
  }

  return (
    <>
      <Button size="small" onClick={handleOpen}>
        从数据表添加字段
      </Button>
      <Modal
        title="从数据表添加业务字段"
        width={1000}
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
          title="使用已同步的字段结构；已绑定字段、系统字段和子表关联外键自动排除。"
          description="子表需先配置外键和关联主键，并同步字段结构；未完成项会在左侧说明。"
          className="fa-mb12"
        />
        <Spin spinning={loading}>
          <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 20, minHeight: 420 }}>
            <div style={{ borderRight: '1px solid var(--ant-color-border)', paddingRight: 16, maxHeight: 460, overflowY: 'auto' }}>
              <Typography.Text type="secondary">主表</Typography.Text>
              <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
                {mainSources.map((item) => renderSource(item, '主表'))}
              </Space>

              <Typography.Text type="secondary" style={{ display: 'block', marginTop: 20 }}>
                关联子表
              </Typography.Text>
              <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
                {subtableSources.map((item) => renderSource(item, '子表'))}
                {!loading && subtableSources.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无关联子表" />}
              </Space>
            </div>

            <div style={{ minWidth: 0 }}>
              {source ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <Typography.Text strong>{source.label}</Typography.Text>
                    <Typography.Text type="secondary" style={{ display: 'block' }}>
                      {source.tableName}
                    </Typography.Text>
                  </div>
                  <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                    {columns.map((column) => {
                      const used = bound.has(column.field);
                      const supported = Boolean(getColumnControlType(column));
                      return (
                        <div key={column.field} style={{ padding: '8px 0', borderBottom: '1px solid var(--ant-color-border-secondary)' }}>
                          <Checkbox
                            disabled={loading || used || !supported}
                            checked={fields.includes(column.field)}
                            onChange={(event) =>
                              setFields((current) => (event.target.checked ? [...current, column.field] : current.filter((field) => field !== column.field)))
                            }
                          >
                            <Space size={8} wrap>
                              <span>{column.comment || column.field}</span>
                              <Typography.Text type="secondary">
                                {column.field} · {column.type}
                              </Typography.Text>
                              {used && <Tag>已绑定</Tag>}
                              {!supported && <Tag color="warning">请手动配置控件</Tag>}
                            </Space>
                          </Checkbox>
                        </div>
                      );
                    })}
                    {!loading && columns.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可添加的业务字段" />}
                  </div>
                </>
              ) : (
                <Empty description="请选择数据表" />
              )}
            </div>
          </div>
        </Spin>
      </Modal>
    </>
  );
}
