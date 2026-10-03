import { useEffect, useMemo, useRef, useState } from 'react';
import { useFaFormStore } from '../stores/useFaFormStore';
import { findParentFormItem } from '../utils';
import { cloneDeep, isNil } from 'lodash';
import { Button, Empty, Form, Input, InputNumber, Select, Space, Switch, Tag } from 'antd';
import FormItemNumberProperty from './item/FormItemNumberProperty';
import FormItemOptionsEditor from './item/FormItemOptionsEditor';
import FormItemInputProperty from './item/FormItemInputProperty';
import { SyncOutlined } from '@ant-design/icons';
import { FaUtils } from '@fa/ui';
import { FaFormItemsFieldTypes, FaFormItemTypeOptions } from '../config';
import FormItemDecoTextProperty from './item/FormItemDecoTextProperty';
import FormItemDecoHrefProperty from './item/FormItemDecoHrefProperty';
import FormItemDecoHrProperty from './item/FormItemDecoHrProperty';
import FormItemDecoAlertProperty from './item/FormItemDecoAlertProperty';
import FormItemHighSubtableProperty from './item/FormItemHighSubtableProperty';
import { flowFormApi } from '@features/fa-flow-pages/services';
import { tailFields } from '@features/fa-flow-pages/configs/form';

/**
 * @author xu.pengfei
 * @date 2025-12-17 15:01:10
 */
export default function FormItemPropertyPanel() {
  const [form] = Form.useForm();
  const flowForm = useFaFormStore((state) => state.flowForm);
  const selectedFormItem = useFaFormStore((state) => state.selectedFormItem);
  const updateSelectedFormItem = useFaFormStore((state) => state.updateSelectedFormItem);
  const config = useFaFormStore((state) => state.config);
  
  // 监听 tableName 字段的值
  const tableName = Form.useWatch('tableName', form);
  const choiceOptions = Form.useWatch('options', form) || [];

  // 查找父节点
  const parentFormItem = useMemo(() => {
    if (!selectedFormItem?.id || !config.items) return undefined;
    let parent = findParentFormItem(config.items, selectedFormItem.id);
    while (parent && parent.type !== 'high_subtable') {
      parent = findParentFormItem(config.items, parent.id);
    }
    return parent;
  }, [selectedFormItem?.id, config.items]);

  // 判断父节点是否为设计子表
  const isParentSubtable = parentFormItem?.type === 'high_subtable';
  
  // 如果父节点是设计子表,则 tableName 为父节点的 subtable_tableName
  const subtableTableName = isParentSubtable ? parentFormItem?.subtable_tableName : undefined;

  const previousItemId = useRef<string>();
  useEffect(() => {
    if (previousItemId.current !== selectedFormItem?.id) {
      form.resetFields();
      previousItemId.current = selectedFormItem?.id;
    }
    if (!selectedFormItem) return;
    const nextTableName = subtableTableName || selectedFormItem.tableName || flowForm.dataConfig?.main?.tableName;
    form.setFieldsValue({ ...selectedFormItem, tableName: nextTableName,
      required: selectedFormItem.rules?.some(rule => rule.required) || false });
    if (isParentSubtable && nextTableName !== selectedFormItem.tableName) {
      updateSelectedFormItem({ tableName: nextTableName });
    }
  }, [selectedFormItem, isParentSubtable, subtableTableName]);

  const tableOptions = useMemo(() => {
    const options = [];
    if (flowForm && flowForm.dataConfig && flowForm?.dataConfig?.main) {
      options.push({ label: `${flowForm.dataConfig.main.tableName}(${flowForm.dataConfig.main.comment})`, value: flowForm.dataConfig.main.tableName });
    }
    if (subtableTableName) {
      options.push({ label: `${subtableTableName}（${parentFormItem?.label || '关联子表'}）`, value: subtableTableName });
    }
    return options;
  }, [flowForm, subtableTableName, parentFormItem?.label]);

  // 动态获取列信息
  const [columnOptions, setColumnOptions] = useState<Array<{label: string, value: string, originalComment: string}>>([]);

  // 监听 tableName 变化,调用接口获取列信息
  useEffect(() => {
    let active = true;
    setColumnOptions([]);
    if (tableName) {
      flowFormApi.queryTableStructure({ tableName }).then(res => {
        if (!active) return;
        if (res.data && res.data.columns) {
          const options = res.data.columns.filter(col => !['id', ...tailFields].includes(col.field.toLowerCase()) || col.field === selectedFormItem?.name).map(col => ({
            label: `${col.field}(${col.comment})`,
            value: col.field,
            originalComment: col.comment,
          }));
          
          // 将系统字段移到尾部
          const systemFields = ['flow_instance_id', 'tenant_id', 'crt_time', 'crt_user', 'upd_time', 'upd_user', 'deleted'];
          const sortedOptions = options.sort((a, b) => {
            const aIsSystem = systemFields.includes(a.value);
            const bIsSystem = systemFields.includes(b.value);
            
            if (aIsSystem && !bIsSystem) return 1;  // a 是系统字段,排后面
            if (!aIsSystem && bIsSystem) return -1; // b 是系统字段,排后面
            return 0; // 保持原有顺序
          });
          
          setColumnOptions(sortedOptions);
        } else {
          setColumnOptions([]);
        }
      }).catch(() => {
        if (active) setColumnOptions([]);
      });
    } else {
      setColumnOptions([]);
    }
    return () => { active = false; };
  }, [tableName, selectedFormItem?.id]);

  if (isNil(selectedFormItem)) {
    return <Empty description="未选择表单项" className='fa-mt12' />;
  }

  // 判断是否绑定数据库的字段
  const isFieldItem = FaFormItemsFieldTypes.includes(selectedFormItem?.type);

  return (
    <div className='fa-flex-column fa-p12 fa-scroll-auto-y'>
      <div className='fa-mb12'>
        <Tag style={{fontSize: '13px'}} color='success' variant='solid' className='fa-hover' onClick={() => FaUtils.copyToClipboard(selectedFormItem.id)}>{selectedFormItem.id}</Tag>
      </div>

      <div>
        <Form form={form} styles={{ label: { width: 80 }}}
          // 1. 用户交互修改 → onValuesChange 自动同步 store
          onValuesChange={(cv, av) => {
            const { required, ...values } = cloneDeep(av);
            const avCopy = { ...values, rules: [...(selectedFormItem.rules || []).map(({ required: _required, ...rule }) => rule), { required: Boolean(required) }] };
            if ('tableName' in cv) { avCopy.name = undefined; form.setFieldsValue({ name: undefined }); }
            // update label from name
            if ((!av.label || av.label.startsWith('新组件')) && cv.name) {
              const col = columnOptions.find(c => c.value === cv.name);
              if (col) {
                avCopy.label = col.originalComment;
                form.setFieldsValue({ label: col.originalComment });
              }
            }
            if ('options' in cv && ['radio', 'select'].includes(selectedFormItem.type)) {
              const available = new Set((values.options || []).map((option: { value: string | number }) => option.value));
              avCopy.initialValue = Array.isArray(values.initialValue)
                ? values.initialValue.filter((value: string | number) => available.has(value))
                : available.has(values.initialValue) ? values.initialValue : undefined;
              form.setFieldsValue({ initialValue: avCopy.initialValue });
            }
            updateSelectedFormItem(avCopy);
          }}
        >
          <Form.Item name="type" label="控件类型" rules={[{ required: true }]}>
            <Select options={FaFormItemTypeOptions} allowClear disabled />
          </Form.Item>
          {isFieldItem && (
            <>
              <Form.Item name="tableName" label="数据库表" rules={[{ required: true }]}>
                <Select options={tableOptions} allowClear disabled={isParentSubtable} />
              </Form.Item>
              <Form.Item name="name" label="控件字段" rules={[{ required: true }]}>
                <Select options={columnOptions} disabled={!tableName} allowClear showSearch optionFilterProp="label" />
              </Form.Item>
              <Space.Compact>
                <Form.Item name="label" label="控件标题" rules={[{ required: true }]}>
                  <Input allowClear />
                </Form.Item>
                <Button icon={<SyncOutlined />} onClick={() => {
                  const col = columnOptions.find(c => c.value === form.getFieldValue('name'));
                  if (col) {
                    form.setFieldsValue({ label: col.originalComment });
                    updateSelectedFormItem({ label: col.originalComment });
                  }
                }}></Button>
              </Space.Compact>
              <Form.Item name="required" label="必填" valuePropName="checked">
                <Switch />
              </Form.Item>
              {['input', 'textarea', 'inputnumber'].includes(selectedFormItem.type) && <Form.Item name="initialValue" label="默认值">
                {selectedFormItem.type === 'inputnumber' ? <InputNumber style={{ width: '100%' }} /> : <Input allowClear placeholder="选填，填报时自动带入" />}
              </Form.Item>}
            </>
          )}

          {['radio', 'select'].includes(selectedFormItem.type) && <>
            <Form.Item name="options" label="选项">
              <FormItemOptionsEditor />
            </Form.Item>
            <Form.Item name="initialValue" label="默认选项">
              <Select options={choiceOptions} mode={selectedFormItem.type === 'select' ? selectedFormItem.mode : undefined} allowClear placeholder="选填，填报时自动带入" />
            </Form.Item>
            {selectedFormItem.type === 'select' && <FormItemInputProperty />}
          </>}

          {['input', 'inputnumber', 'textarea'].includes(selectedFormItem.type) && (<FormItemInputProperty />)}

          {selectedFormItem.type === 'inputnumber' && <FormItemNumberProperty />}

          {selectedFormItem.type === 'high_subtable' && (<FormItemHighSubtableProperty />)}

          {selectedFormItem.type === 'deco_text' && (<FormItemDecoTextProperty />)}
          {selectedFormItem.type === 'deco_href' && (<FormItemDecoHrefProperty />)}
          {selectedFormItem.type === 'deco_hr' && (<FormItemDecoHrProperty />)}
          {selectedFormItem.type === 'deco_alert' && (<FormItemDecoAlertProperty />)}
        </Form>
      </div>
    </div>
  );
}
