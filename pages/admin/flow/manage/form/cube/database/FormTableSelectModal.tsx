import { generatorApi } from '@/services';
import { Generator } from '@/types';
import { SearchOutlined } from "@ant-design/icons";
import { BaseBizTable, BaseTableUtils, DragModal, DragModalProps, useTableQueryParams, FaberTable, clearForm } from '@fa/ui';
import { Button, Form, Input, Space, message } from 'antd';
import { useRef, useState } from 'react';
import FormTableCreateModal from './FormTableCreateModal';


export interface FormTableSelectModalProps extends DragModalProps {
  fetchFinish?: (v: {tableName: string, comment: string}) => void | Promise<void>;
}

/**
 * FLOW-流程表单实体新增、编辑弹框
 */
export default function FormTableSelectModal({ children, fetchFinish, ...props }: FormTableSelectModalProps) {
  const [open, setOpen] = useState(false);
  const [selItem, setSelItem] = useState<Generator.TableVo>();

  const [form] = Form.useForm();

  const { queryParams, setFormValues, handleTableChange, fetchPageList, loading, list, paginationProps } =
    useTableQueryParams<Generator.TableVo>(generatorApi.pageTable, { sorter: { field: 'createTime', order: 'descend' } }, '数据表');

  /** 生成表格字段List */
  function genColumns() {
    const { sorter } = queryParams;
    return [
      BaseTableUtils.genSimpleSorterColumn('表名', 'tableName', undefined, sorter),
      BaseTableUtils.genSimpleSorterColumn('表备注', 'tableComment', undefined, sorter),
      BaseTableUtils.genTimeSorterColumn('创建时间', 'createTime', 170, sorter),
    ] as FaberTable.ColumnsProp<Generator.TableVo>[];
  }

  const busy = useRef(false);
  const [binding, setBinding] = useState(false);
  async function confirm() {
    if (busy.current) return;
    if (!selItem) { message.info('请先选择数据表'); return; }
    if (!/^ff_[a-zA-Z0-9_]+$/.test(selItem.tableName)) { message.warning('请选择 ff_ 开头、使用英文、数字和下划线命名的业务表'); return; }
    busy.current = true;
    setBinding(true);
    try {
      await fetchFinish?.({ tableName: selItem.tableName, comment: selItem.tableComment });
      setOpen(false);
    } catch { /* 关联失败保留选择 */ }
    finally { busy.current = false; setBinding(false); }
  }

  function showModal() {
    setSelItem(undefined);
    setOpen(true)
  }

  return (
    <span>
      <span onClick={showModal}>
        {children}
      </span>
      <DragModal
        title="选择数据表"
        open={open}
        onOk={confirm}
        confirmLoading={loading || binding}
        onCancel={() => !binding && setOpen(false)}
        width={1000}
        styles={{
          body: { padding: 0 }
        }}
        {...props}
      >
        <div className="fa-full fa-flex-column fa-bg-white" style={{ height: 600 }}>
          <div className="fa-flex-row-center fa-p8">
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <Form form={form} layout="inline" onFinish={setFormValues}>
                <Form.Item name="tableName" label="表名">
                  <Input placeholder="请输入表名" allowClear />
                </Form.Item>
                <Form.Item name="tableComment" label="备注">
                  <Input placeholder="请输入备注" allowClear />
                </Form.Item>

                <Space>
                  <Button htmlType="submit" loading={loading} icon={<SearchOutlined />}>
                    查询
                  </Button>
                  <Button onClick={() => clearForm(form)}>重置</Button>
                  <FormTableCreateModal 
                    title="新建数据表"
                    fetchFinish={(newTable) => {
                      // 刷新表格列表
                      fetchPageList();
                      // 自动选中新创建的表
                      setSelItem({
                        tableName: newTable.tableName,
                        tableComment: newTable.comment,
                      } as Generator.TableVo);
                    }}
                  >
                    <Button type="primary">新建</Button>
                  </FormTableCreateModal>
                </Space>
              </Form>
            </div>
          </div>

          <BaseBizTable
            showRowNum
            rowKey="tableName"
            keyName="tableName"
            biz="system_generator_table"
            columns={genColumns()}
            pagination={paginationProps}
            loading={loading}
            dataSource={list}
            onChange={handleTableChange}
            refreshList={() => fetchPageList()}
            showBatchDelBtn={false}
            showTableColConfigBtn={false}
            rowClickSelected
            rowSelection={{
              type: 'radio',
              selectedRowKeys: selItem ? [selItem.tableName] : [],
            }}
            onSelectedRowsChange={(_rowKeys, rows) => {
              setSelItem(rows?.[0]);
            }}
          />
        </div>
      </DragModal>
    </span>
  )
}
