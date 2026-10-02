import { flowFormApi } from '@/services';
import type { Flow } from '@/types';
import { BaseDrawer, Fa, FaJsonView, FaSortList, useApiLoading } from '@fa/ui';
import { Button, Empty, Space, Spin, Tag, Typography, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import FormTableColumnAdd from './FormTableColumnAdd';
import FormTableColumnEdit from './FormTableColumnEdit';
import { isSystemColumn, mergeBusinessColumns } from './columnUtils';
import './FormTableColumnEdit.scss';

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
    <div className="fa-db-table-scroll">
      <div className="fa-db-table-grid">
        <div className="fa-db-column-row fa-db-column-header">
          <span>字段名</span><span>中文说明</span><span>类型</span><span>长度 / 精度·小数位</span><span>必填</span><span>默认值</span><span>键属性</span><span>操作</span><span />
        </div>
        <Spin spinning={loading || syncing}>
          {!businessColumns.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无业务字段，请添加字段" />}
          {businessColumns.length > 0 && <FaSortList rowKey="field" list={businessColumns}
            renderItem={column => <FormTableColumnEdit column={column} tableName={info.tableName} databaseType={info.databaseType} onSuccess={() => refresh(true)} />}
            onSortEnd={sortBusiness} itemStyle={{ padding: 0, borderBottom: '1px solid var(--fa-border-color)' }} handleStyle={{ width: 32, minWidth: 32 }} vertical handle />}
          <FormTableColumnAdd tableName={info.tableName} databaseType={info.databaseType} onSuccess={() => refresh(true)} />
          <div className="fa-db-system-heading"><Button type="link" onClick={() => setShowSystem(value => !value)}>{showSystem ? '隐藏' : '显示'}系统字段（{systemColumns.length}）</Button><span className="fa-text-secondary">系统字段由平台维护，隐藏不影响保存与同步</span></div>
          {showSystem && systemColumns.map(column => <FormTableColumnEdit key={column.field} column={column} tableName={info.tableName} databaseType={info.databaseType} />)}
        </Spin>
      </div>
    </div>
  </div>;
}
