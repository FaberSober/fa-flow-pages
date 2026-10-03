import { Flow } from '@/types';
import { Table } from 'antd';
import { cloneDeep, each, get, set } from 'lodash';
import { useMemo } from 'react';
import { useFlowFormEditStore } from '../../store/useFlowFormEditStore';
import { reconcileSelectedColumns, sortFieldsByTail } from '@features/fa-flow-pages/configs/form';

/**
 * @author xu.pengfei
 * @date 2025-12-18 21:00:01
 */
export default function TableQuery() {
  const { flowForm, updateFlowFormTableConfig } = useFlowFormEditStore()

  const datasource = useMemo(() => {
    const fields: Flow.FlowFormDataConfigColumn[] = []
    if (flowForm && flowForm.dataConfig && flowForm.dataConfig.main && flowForm.dataConfig.main.columns) {
      each(flowForm.dataConfig.main.columns, col => {
        fields.push({ ...col, table: flowForm.dataConfig.main.tableName })
      })
      sortFieldsByTail(fields);
    }
    return fields;
  }, [flowForm])

  const selectedRowKeys = useMemo(() => {
    const keys: string[] = []
    const queryColumns = get(flowForm, 'tableConfig.query.columns', []);
    each(queryColumns, col => {
      keys.push(col.field)
    })
    return keys;
  }, [flowForm])

  return (
    <div className='fa-full fa-relative'>
      <Table
        rowKey='field'
        columns={[
          { dataIndex: 'comment', title: '名称' },
          { dataIndex: 'field', title: '查询字段' },
        ]}
        dataSource={datasource}
        size='small'
        rowSelection={{
          type: 'checkbox',
          selectedRowKeys: selectedRowKeys,
          onChange: (_selectedRowKeys, selectedRows) => {
            if (!flowForm) return;
            const queryColumns = reconcileSelectedColumns<Flow.TableConfigQueryColumn, Flow.FlowFormDataConfigColumn>(
              get(flowForm, 'tableConfig.query.columns', []), selectedRows, (item, index) => {
                return {
                  table: item.table,
                  field: item.field,
                  dataType: item.dataType,
                  label: item.comment||item.field,
                  queryType: 'like',
                  default: '',
                  multiple: false,
                  sort: index
                }
              })
            const nextFlowForm = cloneDeep(flowForm);
            set(nextFlowForm, 'tableConfig.query.columns', queryColumns)
            updateFlowFormTableConfig(nextFlowForm)
          },
        }}
        pagination={false}
      />
    </div>
  );
}
