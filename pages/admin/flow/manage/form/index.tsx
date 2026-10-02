import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { AuthDelBtn, BaseBizTable, BaseTableUtils, clearForm, FaberTable, useDelete, useDeleteByQuery, useExport, useTableQueryParams } from '@fa/ui';
import { Button, Form, Input, Space, Typography } from 'antd';
import { flowFormApi as api } from '@/services';
import { Flow } from '@/types';
import FlowFormConfigDrawer from './modal/FlowFormConfigDrawer';
import FlowFormModal from './modal/FlowFormModal';
import FlowFormViewDataDrawer from './modal/FlowFormViewDataDrawer';

const serviceName = '表单';
const biz = 'flow_form';

/**
 * FLOW-流程表单表格查询
 */
export default function FlowFormList() {
  const [form] = Form.useForm();

  const { queryParams, setFormValues, handleTableChange, setSceneId, setConditionList, fetchPageList, loading, list, dicts, paginationProps } =
          useTableQueryParams<Flow.FlowForm>(api.page, {}, serviceName)

  const [handleDelete] = useDelete<number>(api.remove, fetchPageList, serviceName)
  const [exporting, fetchExportExcel] = useExport(api.exportExcel, queryParams)
  const [_, deleteByQuery] = useDeleteByQuery(api.removeByQuery, queryParams, fetchPageList);

  /** 生成表格字段List */
  function genColumns() {
    const { sorter } = queryParams;
    return [
      BaseTableUtils.genIdColumn('ID', 'id', 70, sorter),
      {
        ...BaseTableUtils.genSimpleSorterColumn('所属分类', 'catagoryId', 150, sorter),
        render: (_, record) => record.catagoryName || '未分类',
      },
      BaseTableUtils.genSimpleSorterColumn('表单名称', 'name', 240, sorter),
      BaseTableUtils.genEnumSorterColumn('状态', 'status', 100, sorter, dicts),
      ...BaseTableUtils.genUpdateColumns(sorter),
      BaseTableUtils.genSimpleSorterColumn('编码', 'no', 120, sorter),
      BaseTableUtils.genEnumSorterColumn('表单类型', 'type', 100, sorter, dicts),
      BaseTableUtils.genSimpleSorterColumn('排序', 'sort', 100, sorter),
      BaseTableUtils.genSimpleSorterColumn('图标', 'icon', 100, sorter),
      BaseTableUtils.genSimpleSorterColumn('表名', 'tableName', 150, sorter),
      BaseTableUtils.genSimpleSorterColumn('备注', 'remark', 200, sorter),
      ...BaseTableUtils.genCtrColumns(sorter),
      {
        title: '操作',
        dataIndex: 'menu',
        render: (_, r) => (
          <Space>
            {r.tableName && r.dataConfig?.main && <FlowFormViewDataDrawer item={r} />}
            <FlowFormConfigDrawer itemId={r.id} refresh={fetchPageList} />
            <FlowFormModal editBtn title={`编辑${serviceName}信息`} record={r} fetchFinish={fetchPageList} />
            <AuthDelBtn handleDelete={() => handleDelete(r.id)} />
          </Space>
        ),
        width: 300,
        fixed: 'right',
        tcRequired: true,
        tcType: 'menu',
      },
    ] as FaberTable.ColumnsProp<Flow.FlowForm>[];
  }

  return (
    <div className="fa-full-content-p12 fa-flex-column fa-bg-white">
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, position: 'relative', padding: 8 }}>
        <div>
          <div className="fa-h3">表单管理</div>
          <Typography.Text type="secondary">创建表单信息后，依次配置数据库表、表单和列表</Typography.Text>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Form form={form} layout="inline" onFinish={setFormValues} style={{ flexWrap: 'wrap', gap: 8 }}>
            <Form.Item name="name" label="表单名称">
              <Input placeholder="搜索表单名称" allowClear />
            </Form.Item>
            <Form.Item name="no" label="编码">
              <Input placeholder="请输入编码" allowClear />
            </Form.Item>

            <Space wrap>
              <Button htmlType="submit" loading={loading} icon={<SearchOutlined />}>查询</Button>
              <Button onClick={() => clearForm(form)}>重置</Button>
              <FlowFormModal addBtn title={`新增${serviceName}`} fetchFinish={fetchPageList} />
              <Button loading={exporting} icon={<DownloadOutlined />} onClick={fetchExportExcel}>导出</Button>
            </Space>
          </Form>
        </div>
      </div>

      <BaseBizTable
        rowKey="id"
        biz={biz}
        columns={genColumns()}
        pagination={paginationProps}
        loading={loading}
        dataSource={list}
        onChange={handleTableChange}
        refreshList={() => fetchPageList()}
        batchDelete={(ids) => api.removeBatchByIds(ids)}
        onSceneChange={(v) => setSceneId(v)}
        onConditionChange={(cL) => setConditionList(cL)}
        showDeleteByQuery
        onDeleteByQuery={deleteByQuery}
      />
    </div>
  );
}
