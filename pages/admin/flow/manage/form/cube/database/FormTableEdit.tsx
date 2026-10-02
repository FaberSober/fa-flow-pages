import { Flow } from '@features/fa-flow-pages/types';
import { useEffect, useRef, useState } from 'react';
import { BaseDrawer, Fa, FaFlexRestLayout, useApiLoading } from '@fa/ui';
import { flowFormApi, flowFormTableApi } from '@features/fa-flow-pages/services';
import FormTableColumnTable from './FormTableColumnTable';
import { Empty, Spin, message } from 'antd';
import './FormTableEdit.scss';
import clsx from 'clsx';
import FormTableSelectModal from './FormTableSelectModal';
import FormTableLink from './FormTableLink';
import { useFlowFormEditStore } from '../../store/useFlowFormEditStore';


/**
 * @author xu.pengfei
 * @date 2025-12-16 19:50:11
 */
export default function FormTableEdit() {

  const { flowForm, updateFlowFormDataConfig } = useFlowFormEditStore();
  const [tableName, setTableName] = useState<string>();
  const [tableInfo, setTableInfo] = useState<Flow.TableInfoVo>();
  const [linkTables, setLinkTables] = useState<Flow.FlowFormTable[]>([]);
  const selectedTable = useRef<string>();
  const selectionVersion = useRef(0);
  const configSaving = useRef(false);
  const loadedFormId = useRef(flowForm?.id);
  const formIdRef = useRef(flowForm?.id);
  formIdRef.current = flowForm?.id;
  const loading = useApiLoading(flowFormApi.getUrl('queryTableStructure'));
  const hasMainTable = flowForm?.dataConfig?.main?.tableName;

  useEffect(() => {
    const mainName = flowForm?.dataConfig?.main?.tableName;
    if (mainName && (selectedTable.current !== mainName || loadedFormId.current !== flowForm?.id)) {
      loadedFormId.current = flowForm?.id;
      handleSelTable(mainName, true);
    }
    if (!mainName) { selectedTable.current = undefined; setTableName(undefined); setTableInfo(undefined); }
    return () => { selectionVersion.current += 1; };
  }, [flowForm?.id, hasMainTable]);

  useEffect(() => { handleGetLinkTables(); }, [flowForm?.id]);

  async function handleSetMainTable(value: { tableName: string; comment: string }) {
    if (!flowForm) throw new Error('未加载表单');
    if (configSaving.current) { message.info('正在保存配置，请稍后重试'); throw new Error('配置保存中'); }
    configSaving.current = true;
    try {
      const res = await flowFormApi.queryTableStructure({ tableName: value.tableName });
      if (res.status !== Fa.RES_CODE.OK || !res.data?.exist) {
        message.error(res.message || '数据表不存在');
        throw new Error('数据表不存在');
      }
      const dataConfig = {
        ...flowForm.dataConfig,
        main: { tableName: value.tableName, comment: value.comment, pkField: res.data.pkField,
          columns: res.data.columns.map((column, sort) => ({ ...column, table: value.tableName, sort })) },
      };
      const saved = await flowFormApi.update(flowForm.id, { tableName: value.tableName, dataConfig });
      if (saved.status !== Fa.RES_CODE.OK) { message.error(saved.message || '关联主表失败'); throw new Error('关联主表失败'); }
      if (formIdRef.current !== flowForm.id) return;
      selectionVersion.current += 1;
      selectedTable.current = value.tableName;
      setTableName(value.tableName);
      setTableInfo(res.data);
      updateFlowFormDataConfig(dataConfig);
      message.success('主表已关联');
    } finally { configSaving.current = false; }
  }

  async function handleColumnsChange(columns: Flow.FlowFormDataConfigColumn[]) {
    if (!flowForm || !tableInfo) throw new Error('表信息未加载');
    if (configSaving.current) { message.info('正在保存配置，请稍后重试'); throw new Error('配置保存中'); }
    configSaving.current = true;
    try {
      const updated = { tableName: tableInfo.tableName, pkField: tableInfo.pkField, comment: tableInfo.tableComment, columns };
      if (tableName === flowForm.dataConfig?.main?.tableName) {
        const dataConfig = { ...flowForm.dataConfig, main: updated };
        const res = await flowFormApi.update(flowForm.id, { dataConfig });
        if (res.status !== Fa.RES_CODE.OK) { message.error(res.message || '同步配置失败'); throw new Error('同步配置失败'); }
        if (formIdRef.current === flowForm.id) updateFlowFormDataConfig(dataConfig);
      } else {
        const linked = linkTables.find(table => table.tableName === tableName);
        if (!linked) throw new Error('关联子表不存在');
        const res = await flowFormTableApi.update(linked.id, { ...linked, dataConfig: updated });
        if (res.status !== Fa.RES_CODE.OK) { message.error(res.message || '同步子表配置失败'); throw new Error('同步子表配置失败'); }
        if (formIdRef.current === flowForm.id) setLinkTables(previous => previous.map(table => table.id === linked.id ? { ...table, dataConfig: updated } : table));
      }
    } finally { configSaving.current = false; }
  }

  async function handleSelTable(name: string, force = false) {
    if (!force && name === selectedTable.current && tableInfo) return;
    selectedTable.current = name;
    setTableName(name);
    setTableInfo(undefined);
    const version = ++selectionVersion.current;
    try {
      const res = await flowFormApi.queryTableStructure({ tableName: name });
      if (version !== selectionVersion.current) return;
      if (res.status !== Fa.RES_CODE.OK) { message.error(res.message || '加载表结构失败'); return; }
      const config = name === flowForm?.dataConfig?.main?.tableName ? flowForm?.dataConfig?.main : linkTables.find(table => table.tableName === name)?.dataConfig;
      const sorts = new Map((config?.columns || []).map(column => [column.field, column.sort]));
      res.data.columns.sort((a, b) => (sorts.get(a.field) ?? Number.MAX_SAFE_INTEGER) - (sorts.get(b.field) ?? Number.MAX_SAFE_INTEGER));
      setTableInfo(res.data);
    } catch { /* 请求层提示错误 */ }
  }

  async function handleGetLinkTables() {
    if (!flowForm?.id) return;
    const id = flowForm.id;
    try {
      const res = await flowFormTableApi.list({ query: { flowFormId: id }, sorter: 'sort asc' });
      if (formIdRef.current === id && res.status === Fa.RES_CODE.OK) setLinkTables(res.data || []);
    } catch { /* 请求层提示错误 */ }
  }

  return (
    <div className='fa-full fa-flex-row fa-gap12'>
      <div style={{ width: 260, padding: 12 }} className='fa-card fa-flex-column'>
        
        {/* Main Table Section */}
        <div className="fa-mb16">
          <div className="fa-form-table-title">
            <span>主表</span>
            {!hasMainTable && (
              <FormTableSelectModal fetchFinish={handleSetMainTable}>
                <a style={{ fontSize: 12 }}>关联</a>
              </FormTableSelectModal>
            )}
            {hasMainTable && (
              <FormTableSelectModal fetchFinish={handleSetMainTable}>
                <a style={{ fontSize: 12, opacity: 0.5, color: 'inherit' }}>切换</a>
              </FormTableSelectModal>
            )}
          </div>
          
          {!hasMainTable && (
             <div className="fa-text-secondary fa-text-center fa-py12" style={{ fontSize: 12, background: 'var(--fa-bg-color)', borderRadius: 4 }}>
                暂无主表
             </div>
          )}

          {hasMainTable && (
            <div 
              className={clsx('fa-form-table-item', tableName === flowForm?.dataConfig?.main?.tableName && 'fa-form-table-item-active')}
              onClick={() => hasMainTable && handleSelTable(hasMainTable)}
            >
              <div className="i-material-symbols:table fa-form-item-icon"/>
              <span>{flowForm?.dataConfig?.main?.tableName}</span>
            </div>
          )}
        </div>

        {/* Sub Table Section */}
        <div className="fa-flex-1 fa-flex-column" style={{ minHeight: 0 }}>
          <div className="fa-form-table-title">
            <span>关联子表</span>
            <BaseDrawer triggerDom={<a style={{ fontSize: 12 }}>添加</a>} size={1200}>
              {flowForm && <FormTableLink item={flowForm} onRefresh={handleGetLinkTables} />}
            </BaseDrawer>
          </div>
          
          <div className="fa-form-table-list fa-flex-1 fa-scroll-y">
            {linkTables.length === 0 && (
              <div className="fa-text-secondary fa-text-center fa-py12" style={{ fontSize: 12 }}>
                暂无子表
              </div>
            )}
            {linkTables.map((linkTable) => (
              <div
                key={linkTable.id}
                className={clsx('fa-form-table-item', tableName === linkTable.tableName && 'fa-form-table-item-active')}
                onClick={() => handleSelTable(linkTable.tableName)}
              >
                <div className="i-material-symbols:table-rows fa-form-item-icon" />
                <span>{linkTable.tableName}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <FaFlexRestLayout className="fa-full-content fa-card">
        <div className='fa-p-16 fa-full'>
          {flowForm && tableInfo && tableInfo.exist ? (
            <FormTableColumnTable key={tableInfo.tableName} item={flowForm} tableInfo={tableInfo} configuredColumns={tableName === hasMainTable ? flowForm.dataConfig?.main?.columns : linkTables.find(table => table.tableName === tableName)?.dataConfig?.columns} onColumnsChange={handleColumnsChange} />
          ) : <Spin spinning={loading}><Empty description={loading ? '正在加载表结构' : hasMainTable ? '表结构未加载，请选择数据表' : '请先关联或新建业务数据表'} /></Spin>}
        </div>
      </FaFlexRestLayout>
    </div>
  );
}
