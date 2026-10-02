import { DownloadOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { AuthDelBtn, BaseBizTable, BaseTableUtils, clearForm, FaberTable, FaHref, useDelete, useDeleteByQuery, useExport, useTableQueryParams } from '@fa/ui';
import { Button, Form, Input, Space, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { flowFormApi as api } from '@/services';
import { Flow } from '@/types';
import FlowFormConfigDrawer from './modal/FlowFormConfigDrawer';
import FlowFormModal from './modal/FlowFormModal';
import FlowFormViewDataDrawer from './modal/FlowFormViewDataDrawer';

const serviceName = '表单';
const biz = 'flow_form';

function hasDesignerDraft(record: Flow.FlowForm) {
  const designer = (record.config as unknown as { designer?: { version?: unknown; items?: unknown } } | undefined)?.designer;
  return designer?.version === 1 && Array.isArray(designer.items);
}

/**
 * FLOW-流程表单表格查询
 */
export default function FlowFormList() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const { queryParams, setFormValues, handleTableChange, setSceneId, setConditionList, fetchPageList, loading, list, dicts, paginationProps } =
          useTableQueryParams<Flow.FlowForm>(api.page, {}, serviceName)

  const [handleDelete] = useDelete<number>(api.remove, fetchPageList, serviceName)
  const [exporting, fetchExportExcel] = useExport(api.exportExcel, queryParams)
  const [_, deleteByQuery] = useDeleteByQuery(api.removeByQuery, queryParams, fetchPageList);

  /** 生成表格字段List */
  function genColumns() {
    const { sorter } = queryParams;
    const statusColumn = BaseTableUtils.genEnumSorterColumn('状态', 'status', 100, sorter, dicts);
    return [
      BaseTableUtils.genIdColumn('ID', 'id', 70, sorter),
      {
        ...BaseTableUtils.genSimpleSorterColumn('所属分类', 'catagoryId', 150, sorter),
        render: (_, record) => record.catagoryName || '未分类',
      },
      BaseTableUtils.genSimpleSorterColumn('表单名称', 'name', 240, sorter),
      {
        ...statusColumn,
        render: (value, record, index) => hasDesignerDraft(record) && !record.tableName
          ? <Tag color="blue">设计草稿</Tag>
          : statusColumn.render?.(value, record, index),
      },
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
        render: (_, r) => {
          const isDesignerDraft = hasDesignerDraft(r);
          return (
            <Space>
              {!isDesignerDraft && <FlowFormViewDataDrawer item={r} />}
              {isDesignerDraft ? (
                <FaHref icon={<EditOutlined />} text="设计" onClick={() => navigate(`/admin/flow/manage/form/designer?id=${r.id}`)} />
              ) : (
                <FlowFormConfigDrawer itemId={r.id} refresh={fetchPageList} />
              )}
              <FlowFormModal editBtn title={`编辑${serviceName}信息`} record={r} fetchFinish={fetchPageList} />
              <AuthDelBtn handleDelete={() => handleDelete(r.id)} />
            </Space>
          );
        },
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
          <Typography.Text type="secondary">新建表单，添加字段，保存后可随时继续设计</Typography.Text>
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
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/flow/manage/form/designer')}>
                新建表单
              </Button>
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
