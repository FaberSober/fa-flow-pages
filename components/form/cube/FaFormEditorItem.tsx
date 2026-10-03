import { DepartmentCascade, UserSearchSelect } from '@/components';
import { Flow, Flw } from '@/types';
import { UploadFileLocal, UploadImgLocal } from '@fa/ui';
import {
  Cascader,
  Checkbox,
  Col,
  ColorPicker,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Rate,
  Select,
  Slider,
  Switch,
  TimePicker
} from 'antd';
import { useMemo } from 'react';
import { FaFormItemsDecoratorTypes } from '../config';
import FaFormDragLayout from '../FaFormDragLayout';
import { useFaFormStore } from '../stores/useFaFormStore';
import { getTextAreaRows, getTextInputProps } from '../textProperties';
import { toBooleanFormValue } from '../booleanValues';
import { toTemporalValue } from '../temporalValues';
import { getNumberInputProps } from '../numberProperties';
import { getFormItemAuth } from '../utils';
import FaFormItemDecoAlert from './item/FaFormItemDecoAlert';
import FaFormItemDecoHr from './item/FaFormItemDecoHr';
import FaFormItemDecoHref from './item/FaFormItemDecoHref';
import FaFormItemDecoText from './item/FaFormItemDecoText';
import FaFormShowLayout from '../../formShow/FaFormShowLayout';
import FaFormSubTable from './item/FaFormSubTable';

export interface FaFormEditorItemProps {
  formItem: Flow.FlowFormItem;
  flowNode?: Flw.Node;
  disabled?: boolean;
  /** 是否为展示模式 */
  showMode?: boolean;
}

/**
 * @author xu.pengfei
 * @date 2025-12-18 09:49:58
 */
export default function FaFormEditorItem({ formItem, flowNode, disabled, showMode }: FaFormEditorItemProps) {

  const updateFormItemChildren = useFaFormStore((state) => state.updateFormItemChildren);

  const formItemConfig: Flw.NodeExtendConfigFormAuth = useMemo(() => {
    return getFormItemAuth(flowNode, formItem.id || '', disabled);
  }, [formItem, flowNode, disabled]);
  // console.log('formItemConfig', formItem.name, flowNode, formItemConfig);

  const isShowComponent = FaFormItemsDecoratorTypes.includes(formItem.type);

  const viewable = isShowComponent || formItemConfig.view;
  const editable = !isShowComponent && formItemConfig.edit;
  const required = editable && (flowNode?.extendConfig?.formAuth?.[formItem.id]?.required ?? formItem.rules?.some((rule) => rule.required) ?? formItemConfig.required);
  const initialValue = formItem.type === 'datepicker' || formItem.type === 'timepicker'
    ? toTemporalValue(formItem.type, formItem.initialValue)
    : ['switch', 'checkbox'].includes(formItem.type) ? toBooleanFormValue(formItem.initialValue) : formItem.initialValue;
  const rules = editable
    ? [...(formItem.rules || []).map(({ required: _required, ...rule }) => rule), { required }]
    : undefined;

  if (!viewable) {
    return null;
  }

  if (formItem.type === 'high_subtable') {
    const requiredChildren = editable
      ? (formItem.children || []).filter((child) => {
        const auth = getFormItemAuth(flowNode, child.id, disabled);
        const childRequired = flowNode?.extendConfig?.formAuth?.[child.id]?.required
          ?? child.rules?.some((rule) => rule.required)
          ?? auth.required;
        return auth.view && auth.edit && childRequired;
      })
      : [];
    const subTableRules = requiredChildren.length > 0 ? [{
      validator: (_: unknown, value: any[] = []) => {
        const hasMissingValue = value.some((row) => requiredChildren.some((child) => {
          const fieldValue = row?.[child.name || child.id];
          return fieldValue === undefined || fieldValue === null || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
        }));
        return hasMissingValue ? Promise.reject(new Error('请完善子表必填字段')) : Promise.resolve();
      },
    }] : undefined;
    
    // 展示模式:使用 FaFormShowLayout
    if (showMode) {
      return (
        <Form.Item name={formItem.name} rules={[...(rules || []), ...(subTableRules || [])]}>
          <FaFormSubTable formItem={formItem} flowNode={flowNode} disabled={!editable} />
        </Form.Item>
      );
    }
    
    // 编辑模式:使用 FaFormDragLayout
    return (
      <Form.Item name={formItem.name}>
        <FaFormDragLayout
          parentId={formItem.id}
          items={formItem.children || []}
          onChange={(items) => {
            updateFormItemChildren(formItem.id, items);
          }}
          header={
            <Col md={24} style={{ padding: '0 6px' }}>
              <div className="text-sm font-medium">{formItem.label || '标签'}</div>
            </Col>
          }
          root={false}
          allowIn={false}
          allowOut={false}
        />
      </Form.Item>
    );
  }

  if (formItem.type === 'container_row') {
    
    // 展示模式:使用 FaFormShowLayout
    if (showMode) {
      return (
        <FaFormShowLayout
          items={formItem.children || []}
          flowNode={flowNode}
          disabled={disabled}
        />
      );
    }
    
    // 编辑模式:使用 FaFormDragLayout
    return (
      <FaFormDragLayout
        parentId={formItem.id}
        items={formItem.children || []}
        onChange={(items) => {
          updateFormItemChildren(formItem.id, items);
        }}
        header={
          <Col md={24} style={{ padding: '0 6px' }}>
            <div className="text-sm font-medium">{formItem.label || '标签'}</div>
          </Col>
        }
        root={false}
        allowIn={true}
        allowOut={true}
      />
    );
  }

  if (isShowComponent) {
    return (
      <div>
        {/* ------------------------------ 展示组件 ------------------------------ */}
        {formItem.type === 'deco_text' && (<FaFormItemDecoText formItem={formItem} />)}
        {formItem.type === 'deco_href' && (<FaFormItemDecoHref formItem={formItem} />)}
        {formItem.type === 'deco_hr' && (<FaFormItemDecoHr formItem={formItem} />)}
        {formItem.type === 'deco_alert' && (<FaFormItemDecoAlert formItem={formItem} />)}
      </div>
    )
  }

  return (
    <div>
      <Form.Item
        label={formItem.label || '标签'}
        name={formItem.name}
        rules={rules}
        initialValue={initialValue}
        valuePropName={formItem.type === 'checkbox' || formItem.type === 'switch' ? 'checked' : 'value'}
      >
        {formItem.type === 'input' && (
          <Input {...getTextInputProps(formItem)} disabled={!editable} placeholder={formItem.placeholder} />
        )}
        {/* 基础输入类组件 */}
        {formItem.type === 'inputnumber' && (
          <InputNumber {...getNumberInputProps(formItem)} disabled={!editable} style={{ width: '100%' }} placeholder={formItem.placeholder} />
        )}
        {formItem.type === 'textarea' && (
          <Input.TextArea {...getTextInputProps(formItem)} disabled={!editable} rows={getTextAreaRows(formItem, 4)} placeholder={formItem.placeholder} style={{ resize: 'none' }} />
        )}
        {/* 选择类组件 */}
        {formItem.type === 'select' && (
          <Select disabled={!editable} placeholder={formItem.placeholder} options={formItem.options} mode={formItem.mode} allowClear />
        )}
        {formItem.type === 'cascader' && (
          <Cascader disabled={!editable} placeholder={formItem.placeholder} />
        )}
        {formItem.type === 'checkbox' && (
          <Checkbox disabled={!editable}>{formItem.placeholder || '勾选'}</Checkbox>
        )}
        {formItem.type === 'radio' && (
          <Radio.Group disabled={!editable} options={formItem.options} />
        )}
        {/* 日期时间类组件 */}
        {formItem.type === 'datepicker' && (
          <DatePicker disabled={!editable} style={{ width: '100%' }} />
        )}
        {formItem.type === 'timepicker' && (
          <TimePicker disabled={!editable} style={{ width: '100%' }} />
        )}
        {/* 开关和评分 */}
        {formItem.type === 'switch' && (
          <Switch disabled={!editable} />
        )}
        {formItem.type === 'rating' && (
          <Rate disabled={!editable} />
        )}
        {/* 滑块 */}
        {formItem.type === 'slider' && (
          <Slider disabled={!editable} style={{ width: '100%' }} />
        )}
        {/* 颜色选择 */}
        {formItem.type === 'colorpicker' && (
          <ColorPicker disabled={!editable} showText />
        )}
        {/* 文件上传 */}
        {formItem.type === 'fileupload' && (
          <UploadFileLocal disabled={!editable} />
        )}
        {formItem.type === 'imageupload' && (
          <UploadImgLocal disabled={!editable} />
        )}
        {/* 富文本和链接 */}
        {formItem.type === 'richtext' && (
          <Input.TextArea disabled={!editable} rows={6} placeholder={formItem.placeholder || '请输入富文本内容'} />
        )}
        {formItem.type === 'link' && (
          <Input disabled={!editable} placeholder={formItem.placeholder || '请输入链接地址'} type="url" />
        )}

        {/* ------------------------------ 业务组件 ------------------------------ */}
        {formItem.type === 'biz_user_select' && (
          <UserSearchSelect disabled={!editable} placeholder={formItem.placeholder || '请选择用户'} />
        )}
        {formItem.type === 'biz_dept_select' && (
          <DepartmentCascade disabled={!editable} placeholder={formItem.placeholder || '请选择部门'} />
        )}
      </Form.Item>
    </div>
  );
}
