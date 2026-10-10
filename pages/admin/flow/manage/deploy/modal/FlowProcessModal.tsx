import { flowProcessApi as api } from '@/services';
import { Flow, FlowEnums, Flw, FlwEnums } from '@/types';
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { CommonModalProps, DragModal, Fa, FaHref, FaUtils, useApiLoading } from '@fa/ui';
import { getNodeKey } from '@features/fa-flow-pages/components/flow/utils';
import { Button, Form } from 'antd';
import { get } from 'lodash';
import { useState } from 'react';
import FlowProcessForm from '../cube/FlowProcessForm';

type FlowProcessModalProps = CommonModalProps<Flow.FlowProcess> & {
  defaultValues?: Partial<Flow.FlowProcess>;
  fixedFormId?: number;
  onCreated?: (item?: Flow.FlowProcess) => void;
};

/**
 * FLOW-流程定义实体新增、编辑弹框
 */
export default function FlowProcessModal({ children, title, record, fetchFinish, addBtn, editBtn, defaultValues, fixedFormId, onCreated, ...props }: FlowProcessModalProps) {
  const [form] = Form.useForm();

  const [open, setOpen] = useState(false);

  /** 新增Item */
  function invokeInsertTask(params: any) {
    api.save(params).then((res) => {
      FaUtils.showResponse(res, '新增流程定义');
      if (res.status !== Fa.RES_CODE.OK) return;
      setOpen(false);
      if (fetchFinish) fetchFinish();
      onCreated?.(res.data ?? params);
    })
  }

  /** 更新Item */
  function invokeUpdateTask(params: any) {
    api.update(params.id, params).then((res) => {
      FaUtils.showResponse(res, '更新流程定义');
      if (res.status !== Fa.RES_CODE.OK) return;
      setOpen(false);
      if (fetchFinish) fetchFinish();
    })
  }

  /** 提交表单 */
  function onFinish(fieldsValue: any) {
    const values = {
      ...fieldsValue,
      // birthday: FaUtils.getDateStr000(fieldsValue.birthday),
    };
    if (record) {
      invokeUpdateTask({ ...record, ...values });
    } else {
      const params = {
        ...values,
        ...(fixedFormId != null ? { formType: FlowEnums.FlowProcessFormType.CUSTOM, formId: fixedFormId } : {}),
        modelContent: JSON.stringify({
          "key": values.processKey,
          "name": values.processName,
          "nodeConfig": {
            "nodeName": "发起人",
            "nodeKey": getNodeKey(),
            "type": FlwEnums.NodeType.major,
            "childNode": {
              "nodeName": "结束",
              "nodeKey": getNodeKey(),
              "type": FlwEnums.NodeType.end,
            }
          }
        } as Flw.ProcessModel),
      }
      invokeInsertTask(params);
    }
  }

  function getInitialValues() {
    return {
      catagoryId: get(record, 'catagoryId', defaultValues?.catagoryId),
      processKey: get(record, 'processKey', defaultValues?.processKey),
      processName: get(record, 'processName', defaultValues?.processName),
      processIcon: get(record, 'processIcon', defaultValues?.processIcon),
      processType: get(record, 'processType', defaultValues?.processType),
      processVersion: get(record, 'processVersion', defaultValues?.processVersion),
      instanceUrl: get(record, 'instanceUrl', defaultValues?.instanceUrl),
      formType: fixedFormId != null ? FlowEnums.FlowProcessFormType.CUSTOM : get(record, 'formType', defaultValues?.formType),
      formId: fixedFormId ?? get(record, 'formId', defaultValues?.formId),
      remark: get(record, 'remark', defaultValues?.remark),
      useScope: get(record, 'useScope', defaultValues?.useScope),
      processState: get(record, 'processState', defaultValues?.processState),
      // modelContent: get(record, 'modelContent'),
      sort: get(record, 'sort', defaultValues?.sort),
      // birthday: FaUtils.getInitialKeyTimeValue(record, 'birthday'),
    }
  }

  function showModal() {
    setOpen(true)
    form.resetFields();
    form.setFieldsValue(getInitialValues())
  }

  const loading = useApiLoading([ api.getUrl('save'), api.getUrl('update')]);
  return (
    <span>
      <span onClick={showModal}>
        {children}
        {addBtn && <Button icon={<PlusOutlined />} type="primary">新增</Button>}
        {editBtn && <FaHref icon={<EditOutlined />} text="编辑" />}
      </span>
      <DragModal
        title={title}
        open={open}
        onOk={() => form.submit()}
        confirmLoading={loading}
        onCancel={() => setOpen(false)}
        width={700}
        {...props}
      >
        <FlowProcessForm
          form={form}
          onFinish={onFinish}
          initialValues={getInitialValues()}
          fixedFormId={fixedFormId}
          type={record ? 'edit' : 'create'}
        />
      </DragModal>
    </span>
  )
}
