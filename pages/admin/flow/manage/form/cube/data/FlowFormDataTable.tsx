import { flowFormApi } from '@/services';
import { Flow } from '@/types';
import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { AuthDelBtn, BaseBizTable, BaseTableUtils, FaberTable, FaHref, useDelete, useTableQueryParams } from '@fa/ui';
import { Button, Form, Input, Select, Space } from 'antd';
import { each } from 'lodash';
import React, { useMemo, useState } from 'react';
import FlowFormAdd from './cube/FlowFormAdd';
import FlowFormView from './cube/FlowFormView';
import { normalizeFlowFormTableValues } from '@features/fa-flow-pages/components/formShow/utils';
import { getDefaultQueryValues } from '@features/fa-flow-pages/pages/admin/flow/view/form/simpleTable/queryDefaults';
import { formatFormColumnValue, getMainFormFieldMap } from '@features/fa-flow-pages/pages/admin/flow/view/form/simpleTable/columnDisplay';
import { formatNumberColumnValue, isNumericColumn } from '@features/fa-flow-pages/pages/admin/flow/view/form/simpleTable/numberDisplay';
import NumericRangeInput from '@features/fa-flow-pages/pages/admin/flow/view/form/simpleTable/NumericRangeInput';
import DateRangeInput from '@features/fa-flow-pages/pages/admin/flow/view/form/simpleTable/DateRangeInput';

export interface FlowFormDataTableProps {
  flowForm: Flow.FlowForm;
}

/**
 * @author xu.pengfei
 * @date 2025-12-19 14:27:05
 */
export default function FlowFormDataTable({ flowForm }: FlowFormDataTableProps) {
  const [form] = Form.useForm();
  const defaultQueryValues = useMemo(() => getDefaultQueryValues(flowForm.tableConfig?.query?.columns), [flowForm.tableConfig?.query?.columns]);
  const queryFieldMap = useMemo(() => getMainFormFieldMap(flowForm.config?.items), [flowForm.config?.items]);
  const [viewRecord, setViewRecord] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewIndex, setViewIndex] = useState<number>(-1);

  const {queryParams, setFormValues, handleTableChange, fetchPageList, loading, list, paginationProps} =
    useTableQueryParams<any>(flowFormApi.pageFormData, { flowFormId: flowForm.id, formValues: defaultQueryValues }, flowForm.name);

  const tableValues = useMemo(() => normalizeFlowFormTableValues(flowForm, list), [flowForm, list]);

  const [handleDelete] = useDelete<number>((id) => flowFormApi.removeFormDataById(flowForm.id, id), fetchPageList, flowForm.name);
  // const [exporting, fetchExportExcel] = useExport(api.exportExcel, queryParams);

  // 翻页逻辑
  const handlePrev = React.useCallback(() => {
    if (viewIndex > 0) {
      const newIndex = viewIndex - 1;
      setViewIndex(newIndex);
      setViewRecord(tableValues[newIndex]);
    }
  }, [viewIndex, tableValues]);

  const handleNext = React.useCallback(() => {
    if (viewIndex < tableValues.length - 1) {
      const newIndex = viewIndex + 1;
      setViewIndex(newIndex);
      setViewRecord(tableValues[newIndex]);
    }
  }, [viewIndex, tableValues]);

  // 计算边界状态
  const hasPrev = viewIndex > 0;
  const hasNext = viewIndex < tableValues.length - 1;

  function genColumns() {
    const { sorter } = queryParams;
    const columns = ((flowForm.tableConfig?.table?.detail?.showIndex ?? true)
      ? [BaseTableUtils.genIndexColumn(paginationProps)] : []) as FaberTable.ColumnsProp<any>[];
    const fieldMap = getMainFormFieldMap(flowForm.config?.items);
    if (flowForm.tableConfig) {
      each(flowForm.tableConfig.table.columns, col => {
        const columnSorter = col.sorter ? sorter || true : false;
        const column = col.dataType === 'date'
          ? BaseTableUtils.genDateSorterColumn(col.label || col.field, col.field, col.width, columnSorter)
          : ['datetime', 'timestamp'].includes(col.dataType)
            ? BaseTableUtils.genTimeSorterColumn(col.label || col.field, col.field, col.width, columnSorter)
            : BaseTableUtils.genSimpleSorterColumn(col.label || col.field, col.field, col.width, columnSorter);
        column.fixed = col.fix === 'left' || col.fix === 'right' ? col.fix : undefined;
        const formItem = fieldMap.get(col.field);
        if (formItem && ['radio', 'select', 'switch', 'checkbox'].includes(formItem.type)) {
          column.render = value => formatFormColumnValue(formItem, value);
        } else if (isNumericColumn(col.dataType) && col.numberPrecision != null) {
          column.render = value => formatNumberColumnValue(value, col.numberPrecision!);
        }
        columns.push(column);
      });
    }

    columns.push(
      // BaseTableUtils.genTimeSorterColumn('创建时间', 'crtTime', 170, sorter),
      {
        title: '操作',
        dataIndex: 'opr',
        render: (_, r) => (
          <Space>
            <FaHref text='查看' icon={<EyeOutlined />} onClick={() => {
              const index = tableValues.findIndex((item: any) => item.id === r.id);
              setViewIndex(index);
              setViewRecord(r);
              setViewOpen(true);
            }} />
            <AuthDelBtn handleDelete={() => handleDelete(r.id)} />
          </Space>
        ),
        width: 120,
        fixed: 'right',
        tcRequired: true,
        tcType: 'menu',
      },
    );

    return columns;
  }

  return (
    <div className="fa-full-content fa-flex-column fa-content">
      <div className="fa-flex-row-center fa-p8">
        <div className="fa-h3">{flowForm.name}</div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Form form={form} initialValues={defaultQueryValues} layout="inline" onFinish={setFormValues}>
            {flowForm.tableConfig?.query?.columns?.map(col => {
              return (
                <Form.Item name={col.field} label={col.label} key={col.field}>
                  {col.queryType === 'date_range' ? <DateRangeInput /> : col.queryType === 'number_range' ? <NumericRangeInput /> : col.multiple || col.queryType === 'in'
                    ? <Select mode="tags" options={queryFieldMap.get(col.field)?.options} tokenSeparators={[',', '，']}
                        style={{ minWidth: 180 }} placeholder="选择或输入后按回车添加" allowClear />
                    : <Input placeholder={`请输入${col.label}`} allowClear />}
                </Form.Item>
              )
            })}

            <Space>
              <Button htmlType="submit" loading={loading} icon={<SearchOutlined />}>查询</Button>
              <Button onClick={() => { form.resetFields(); setFormValues(defaultQueryValues); }}>重置</Button>
              {flowForm.flowProcessId && (<FlowFormAdd flowForm={flowForm} onSuccess={fetchPageList} />)}
              {/* <Button icon={<DownloadOutlined />}>导出</Button> */}
            </Space>
          </Form>
        </div>
      </div>

      <BaseBizTable
        rowKey="id"
        size={flowForm.tableConfig?.table?.detail?.size ?? 'small'}
        bordered={flowForm.tableConfig?.table?.detail?.bordered ?? false}
        biz={flowForm.no}
        columns={genColumns()}
        pagination={paginationProps}
        loading={loading}
        dataSource={tableValues}
        onChange={handleTableChange}
        refreshList={() => fetchPageList()}
        // batchDelete={(ids) => api.removeBatchByIds(ids)}
        // onSceneChange={(v) => setSceneId(v)}
        // onConditionChange={(cL) => setConditionList(cL)}
      />

      <FlowFormView 
        flowForm={flowForm} 
        record={viewRecord} 
        open={viewOpen} 
        onOpenChange={setViewOpen}
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />
    </div>
  );
}
