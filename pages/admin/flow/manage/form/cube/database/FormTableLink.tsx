import { Flow } from '@/types';
import { useEffect, useRef, useState } from 'react';
import { Button, Table, Popconfirm, Empty, Input, InputNumber, Select, Space, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { flowFormTableApi, flowFormApi } from '@/services';
import { Fa, FaUtils } from '@fa/ui';
import FormTableSelectModal from './FormTableSelectModal';
import { getLinkEditableValues, hasLinkChanges, mergeLinkDrafts } from './linkDrafts';
import { sortFieldsByTail } from '@features/fa-flow-pages/configs/form';

/** 表字段选择器组件 */
interface TableFieldSelectProps {
  value: string;
  tableName: string;
  onChange: (value: string) => void;
  getTableColumns: (tableName: string) => Promise<Flow.TableColumnVo[]>;
  disabled?: boolean;
}

function TableFieldSelect({ value, tableName, onChange, getTableColumns, disabled }: TableFieldSelectProps) {
  const [columns, setColumns] = useState<Flow.TableColumnVo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setColumns([]);
    if (tableName) {
      setLoading(true);
      getTableColumns(tableName).then(columns => { if (active) setColumns(columns); })
        .catch(() => {}).finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [tableName]);

  return (
    <Select
      value={value}
      disabled={disabled}
      style={{ width: '100%' }}
      showSearch
      optionFilterProp="label"
      loading={loading}
      onChange={onChange}
      options={columns.map(col => ({
        label: `${col.field} (${col.comment || col.type})`,
        value: col.field,
      }))}
    />
  );
}

export interface FormTableLinkProps {
  item: Flow.FlowForm;
  onRefresh?: () => void;
}

/**
 * 流程主表关联子表列表管理
 * @author xu.pengfei
 * @date 2026-01-31 13:21:11
 */
export default function FormTableLink({ item, onRefresh }: FormTableLinkProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const savedList = useRef<Flow.FlowFormTable[]>([]);
  const [list, setList] = useState<Flow.FlowFormTable[]>([]);
  const [tableColumnsCache, setTableColumnsCache] = useState<Record<string, Flow.TableColumnVo[]>>({});

  useEffect(() => {
    if (item?.id) {
      savedList.current = [];
      setList([]);
      setTableColumnsCache({});
      fetchList();
    }
  }, [item?.id]);

  /** 获取关联子表列表 */
  function fetchList() {
    if (!item?.id) return;

    setLoading(true);
    return flowFormTableApi.list({ query: { flowFormId: item.id }, sorter: "sort asc" })
      .then((res) => {
        if (res.status !== Fa.RES_CODE.OK) { message.error(res.message || '加载关联子表失败'); return; }
        const previousSaved = savedList.current;
        const next = res.data || [];
        setList(previous => mergeLinkDrafts(next, previousSaved, previous));
        savedList.current = next;
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }

  /** 选择表后，直接创建关联子表记录 */
  async function handleTableSelect(v: { tableName: string; comment: string }) {
    // 校验1：不能添加主表
    if (v.tableName === item.dataConfig?.main?.tableName) {
      message.error('不能添加主表作为关联子表');
      throw new Error('不能添加主表');
    }

    // 校验2：不能重复添加
    const existingTable = list.find(t => t.tableName === v.tableName);
    if (existingTable) {
      message.error(`表 "${v.tableName}" 已存在，不能重复添加`);
      throw new Error('关联子表重复');
    }

    if (busy.current) throw new Error('正在保存关联配置');
    const params = {
      flowFormId: item.id,
      tableName: v.tableName,
      sort: list.length,
      remark: v.comment,
      foreignKey: '', // 用户稍后在表格中选择
      referenceKey: '', // 用户稍后在表格中选择
    };

    busy.current = true;
    setSaving(true);
    try {
      const res = await flowFormTableApi.save(params);
      if (res.status !== Fa.RES_CODE.OK) { message.error(res.message || '新增关联子表失败'); throw new Error('新增失败'); }
      FaUtils.showResponse(res, '新增关联子表');
      await fetchList();
      onRefresh?.();
    } finally { busy.current = false; setSaving(false); }
  }


  /** 删除关联子表 */
  async function handleDelete(id: number) {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      const res = await flowFormTableApi.remove(id);
      if (res.status !== Fa.RES_CODE.OK) { message.error(res.message || '删除关联子表失败'); return; }
      FaUtils.showResponse(res, '删除关联子表');
      await fetchList();
      onRefresh?.();
    } catch { /* 请求层提示错误，保留关联配置 */ }
    finally { busy.current = false; setSaving(false); }
  }

  /** 更新关联子表字段 */
  function handleUpdateField(id: number, field: 'foreignKey' | 'referenceKey' | 'sort' | 'remark', value: string | number) {
    setList(previous => previous.map(row => row.id === id ? { ...row, [field]: value } : row));
  }

  async function handleUpdateRecord(record: Flow.FlowFormTable) {
    if (busy.current) return;
    if (Boolean(record.foreignKey) !== Boolean(record.referenceKey)) { message.info('请同时选择外键字段和关联主键'); return; }
    busy.current = true;
    setSaving(true);
    try {
      const res = await flowFormTableApi.update(record.id, getLinkEditableValues(record));
      if (res.status !== Fa.RES_CODE.OK) { message.error(res.message || '更新关联子表失败'); return; }
      savedList.current = savedList.current.map(row => row.id === record.id ? { ...row, ...getLinkEditableValues(record) } : row);
      setList(previous => previous.map(row => row.id === record.id ? { ...row, ...getLinkEditableValues(record) } : row));
      FaUtils.showResponse(res, '更新关联子表');
      onRefresh?.();
    } catch { /* 请求层提示错误，保留当前行输入供重试 */ }
    finally { busy.current = false; setSaving(false); }
  }

  /** 获取表字段列表（带缓存） */
  async function getTableColumns(tableName: string): Promise<Flow.TableColumnVo[]> {
    if (tableColumnsCache[tableName]) {
      return tableColumnsCache[tableName];
    }

    const res = await flowFormApi.queryTableStructure({ tableName });
    if (res.status !== Fa.RES_CODE.OK || !res.data?.exist) { message.error(res.message || '加载子表字段失败'); throw new Error('加载字段失败'); }
    const columns = res.data.columns || [];
    sortFieldsByTail(columns);
    setTableColumnsCache(prev => ({ ...prev, [tableName]: columns }));
    return columns;
  }

  const columns = [
    {
      title: '排序',
      dataIndex: 'sort',
      width: 80,
      render: (value: number, record: Flow.FlowFormTable) => (
        <InputNumber value={value} precision={0} disabled={saving || loading} style={{ width: '100%' }}
          onChange={value => handleUpdateField(record.id, 'sort', value ?? 0)} />
      ),
    },
    {
      title: '表名',
      dataIndex: 'tableName',
      width: 200,
    },
    {
      title: '外键字段',
      dataIndex: 'foreignKey',
      width: 200,
      render: (value: string, record: Flow.FlowFormTable) => (
        <TableFieldSelect
          value={value}
          tableName={record.tableName}
          onChange={(newValue) => handleUpdateField(record.id, 'foreignKey', newValue)}
          getTableColumns={getTableColumns}
          disabled={saving || loading}
        />
      ),
    },
    {
      title: '关联主键',
      dataIndex: 'referenceKey',
      width: 200,
      render: (value: string, record: Flow.FlowFormTable) => (
        <Select
          value={value}
          disabled={saving || loading}
          style={{ width: '100%' }}
          showSearch
          optionFilterProp="label"
          onChange={(newValue) => handleUpdateField(record.id, 'referenceKey', newValue)}
          options={item.dataConfig?.main?.columns?.map(col => ({
            label: `${col.field} (${col.comment || col.type})`,
            value: col.field,
          })) || []}
        />
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
      render: (value: string, record: Flow.FlowFormTable) => (
        <Input value={value} disabled={saving || loading} placeholder="请输入备注"
          onChange={event => handleUpdateField(record.id, 'remark', event.target.value)} />
      ),
    },
    {
      title: '操作',
      dataIndex: 'opr',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: Flow.FlowFormTable) => (
        <Space>
          <Button type="link" size="small" disabled={saving || loading || !hasLinkChanges(record, savedList.current.find(row => row.id === record.id))}
            onClick={() => handleUpdateRecord(record)}>更新</Button>
          <Popconfirm
            disabled={saving || loading}
            title="确认删除该关联子表？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" danger disabled={saving || loading} icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!item?.id) {
    return <Empty description="请先选择流程表单" />;
  }

  return (
    <div className="fa-full-content fa-flex-column">
      <div className="fa-flex-row-center fa-p8">
        <div className="fa-h3">关联子表管理</div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <FormTableSelectModal fetchFinish={handleTableSelect}>
            <Button type="primary" disabled={saving || loading}>新增关联子表</Button>
          </FormTableSelectModal>
        </div>
      </div>

      <div className="fa-text-secondary fa-p8">修改外键、主键、排序或备注后，点击该行“更新”。关联配置单独保存；关闭前请提交需要保留的修改。</div>
      <div className="fa-flex-1" style={{ padding: '0 8px 8px' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading || saving}
          pagination={false}
          size="small"
          bordered
        />
      </div>
    </div>
  );
}
