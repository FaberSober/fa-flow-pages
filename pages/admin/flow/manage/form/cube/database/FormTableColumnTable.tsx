import { flowFormApi } from '@/services';
import type { Flow } from '@/types';
import { BaseDrawer, Fa, FaJsonView, FaSortList, useApiLoading } from '@fa/ui';
import { Alert, Button, Empty, Popover, Space, Spin, Tag, Typography, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import FormTableColumnAdd from './FormTableColumnAdd';
import FormTableColumnEdit from './FormTableColumnEdit';
import { isSystemColumn, mergeBusinessColumns } from './columnUtils';
import './FormTableColumnEdit.scss';
import { getMissingStructureBindings, getStructureChanges } from './structureChanges';

export interface FormTableColumnTableProps {
  item: Flow.FlowForm;
  tableInfo: Flow.TableInfoVo;
  configuredColumns?: Flow.FlowFormDataConfigColumn[];
  onColumnsChange: (columns: Flow.FlowFormDataConfigColumn[]) => Promise<void>;
}

export default function FormTableColumnTable({ item, tableInfo, configuredColumns, onColumnsChange }: FormTableColumnTableProps) {
  const [info, setInfo] = useState(tableInfo);
  const [showSystem, setShowSystem] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const active = useRef(true);
  const busy = useRef(false);
  useEffect(() => { setInfo(tableInfo); }, [tableInfo]);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const loading = useApiLoading(flowFormApi.getUrl('queryTableStructure'));
  const businessColumns = info.columns.filter(column => !isSystemColumn(column));
  const systemColumns = info.columns.filter(isSystemColumn);

  const changes = getStructureChanges(info.columns, configuredColumns);
  const missingBindings = getMissingStructureBindings(item, info.tableName, info.columns);
  const hasChanges = changes.added.length + changes.removed.length + changes.changed.length > 0;

  function toConfig(columns: Flow.TableColumnVo[]) {
    return columns.map((column, sort) => ({ ...column, table: info.tableName, sort }));
  }

  async function refresh(sync = false) {
    if (busy.current) return;
    busy.current = true;
    setSyncing(sync);
    try {
      const res = await flowFormApi.queryTableStructure({ tableName: info.tableName });
      if (!active.current) return;
      if (res.status !== Fa.RES_CODE.OK || !res.data?.exist) { message.error(res.message || '数据表不存在，刷新失败'); return; }
      const sortMap = new Map((configuredColumns ?? []).map(column => [column.field, column.sort]));
      res.data.columns.sort((a, b) => (sortMap.get(a.field) ?? Number.MAX_SAFE_INTEGER) - (sortMap.get(b.field) ?? Number.MAX_SAFE_INTEGER));
      setInfo(res.data);
      if (sync) { await onColumnsChange(toConfig(res.data.columns)); if (active.current) message.success('数据库结构已同步到配置'); }
      else message.success('已刷新数据库结构；配置未改变');
    } catch { /* 配置保存层/请求层提示错误 */ }
    finally { busy.current = false; if (active.current) setSyncing(false); }
  }

  async function sortBusiness(columns: Flow.TableColumnVo[]) {
    if (busy.current) return;
    busy.current = true;
    setSyncing(true);
    const merged = mergeBusinessColumns(info.columns, columns);
    try {
      await onColumnsChange(toConfig(merged));
      if (active.current) setInfo(previous => ({ ...previous, columns: merged }));
    } catch { /* 失败不更新本地顺序 */ }
    finally { busy.current = false; if (active.current) setSyncing(false); }
  }

  return <div className="fa-flex-column fa-full">
    <div className="fa-db-table-heading">
      <div><Typography.Text strong>{info.tableName}</Typography.Text> <Tag>{info.databaseType === 'mysql' ? 'MySQL' : info.databaseType === 'postgre' ? 'PostgreSQL' : '数据库类型未知'}</Tag>
        <div className="fa-text-secondary">{info.tableComment || '暂无表说明'} · 业务字段 {businessColumns.length} · 系统字段 {systemColumns.length}</div>
      </div>
      <Space wrap>
        <Button disabled={loading || syncing} onClick={() => refresh()}>刷新结构</Button>
        <Button type="primary" loading={syncing} disabled={loading} onClick={() => refresh(true)}>同步到配置</Button>
        <BaseDrawer triggerDom={<Button type="text">查看 JSON</Button>} size={1200}><FaJsonView data={item} defaultExpandDepth={3} /></BaseDrawer>
      </Space>
    </div>
    <div className="fa-db-table-hint fa-text-secondary">字段名建议使用业务含义，如 customer_name；注释用于表单显示名称。字段更新会立即修改数据库，刷新只读取结构。</div>
    <div style={{ height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <Typography.Text type={hasChanges && !syncing ? 'warning' : 'secondary'}>
        {syncing ? '正在同步字段结构…' : hasChanges ? `待同步：新增 ${changes.added.length} · 移除 ${changes.removed.length} · 属性变化 ${changes.changed.length}` : '字段结构已同步'}
      </Typography.Text>
      {hasChanges && !syncing && <Popover trigger="click" title="字段结构变化" content={<div style={{ maxWidth: 480, maxHeight: 300, overflow: 'auto', overflowWrap: 'anywhere' }}>
        {changes.added.length > 0 && <div>新增字段：{changes.added.join('、')}</div>}
        {changes.removed.length > 0 && <div>移除字段：{changes.removed.join('、')}</div>}
        {changes.changed.length > 0 && <div>属性变化：{changes.changed.join('、')}</div>}
        <div>同步只更新结构映射，已有表单和列表设置保留。</div>
      </div>}><Button type="link" size="small">查看变化</Button></Popover>}
    </div>
    {missingBindings.length > 0 && <Alert type="warning" showIcon style={{ marginBottom: 8 }}
      title="部分配置引用的字段已不存在"
      description={<div>{missingBindings.map(binding => <div key={binding}>{binding}</div>)}<div>请在表单设计或列表设计中调整以上配置，同步结构不会自动删除它们。</div></div>} />}
    <div className="fa-db-table-scroll">
      <div className="fa-db-table-grid">
        <div className="fa-db-column-header">
          <div className="fa-db-column-row" style={{ flex: 1 }}>
            <span>字段名</span><span>中文说明</span><span>类型</span><span>长度 / 精度·小数位</span><span>必填</span><span>默认值</span><span>键属性</span><span>操作</span>
          </div>
          <span style={{ width: 32, minWidth: 32 }} />
        </div>
        <Spin spinning={loading || syncing}>
          {!businessColumns.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无业务字段，请添加字段" />}
          {businessColumns.length > 0 && <FaSortList rowKey="field" list={businessColumns}
            renderItem={column => <FormTableColumnEdit column={column} tableName={info.tableName} databaseType={info.databaseType} onSuccess={() => refresh(true)} />}
            onSortEnd={sortBusiness} itemStyle={{ padding: 0, borderBottom: '1px solid var(--fa-border-color)' }} handleStyle={{ width: 32, minWidth: 32 }} vertical handle />}
          <FormTableColumnAdd tableName={info.tableName} databaseType={info.databaseType} onSuccess={() => refresh(true)} />
          <div className="fa-db-system-heading"><Button type="link" onClick={() => setShowSystem(value => !value)}>{showSystem ? '隐藏' : '显示'}系统字段（{systemColumns.length}）</Button><span className="fa-text-secondary">系统字段由平台维护，隐藏不影响保存与同步</span></div>
          {showSystem && <div className="fa-db-system-details">
            <div className="fa-db-column-row fa-db-system-row fa-db-system-header">
              <span>字段名</span><span>中文说明</span><span>类型</span><span>完整类型</span><span>必填</span><span>默认值</span><span>键属性</span><span>维护方式</span><span />
            </div>
            {systemColumns.map(column => <FormTableColumnEdit key={column.field} column={column} tableName={info.tableName} databaseType={info.databaseType} />)}
          </div>}
        </Spin>
      </div>
    </div>
  </div>;
}
