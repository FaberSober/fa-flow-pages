import { Flow, Flw } from '@/types';
import { DepartmentCascade, UserSearchSelect } from '@/components';
import { Button, Cascader, Checkbox, ColorPicker, DatePicker, Input, InputNumber, Popconfirm, Radio, Rate, Select, Slider, Switch, Table, TimePicker, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { FaUtils } from '@fa/ui';
import { tailFields } from '@features/fa-flow-pages/configs/form';
import { copySubtableRow } from '../../subtableRows';
import { getTextAreaRows, getTextInputProps } from '../../textProperties';
import { toBooleanFormValue } from '../../booleanValues';
import { toTemporalValue } from '../../temporalValues';
import { getNumberInputProps } from '../../numberProperties';
import { getFormItemAuth } from '../../utils';


export interface FaFormSubTableProps {
  formItem: Flow.FlowFormItem;
  /** Form表单传入的数值 */
  value?: any[];
  /** 更新Form表单数值 */
  onChange?: (v: any[]) => void;
  /** 流程节点，用于读取子表字段权限 */
  flowNode?: Flw.Node;
  /** 是否禁止编辑子表 */
  disabled?: boolean;
}

/**
 * @author xu.pengfei
 * @date 2026-02-01 20:38:53
 */
export default function FaFormSubTable({ formItem, value, onChange, flowNode, disabled = false }: FaFormSubTableProps) {
  // Form 重置/清空后同步清空；数据库记录用真实 id，新记录用临时 key。
  const [dataSource, setDataSource] = useState<any[]>([]);

  useEffect(() => {
    setDataSource((value || []).map((row) => (
      (row.id !== undefined && row.id !== null) || row._key
        ? row
        : { ...row, _key: FaUtils.uuid() }
    )));
  }, [value]);

  // 添加行
  const handleAdd = () => {
    const newRow: any = {
      _key: FaUtils.uuid(), // 使用uuid作为唯一key
    };
    
    // 使用设计器配置的默认值，避免多行共享可变数组。
    formItem.children?.forEach((child) => {
      const fieldName = child.name || child.id;
      newRow[fieldName] = ['switch', 'checkbox'].includes(child.type) ? toBooleanFormValue(child.initialValue) : Array.isArray(child.initialValue)
        ? [...child.initialValue]
        : child.initialValue ?? undefined;
    });
    
    setDataSource([...dataSource, newRow]);
    onChange?.([...dataSource, newRow]);
  };

  // 删除行
  const handleDelete = (index: number) => {
    const newData = dataSource.filter((_, i) => i !== index);
    setDataSource(newData);
    onChange?.(newData);
  };

  // 复制后插入原行下方，作为独立新记录保存。
  const handleCopy = (index: number) => {
    if (!canEdit) return;
    const children = (formItem.children || []).filter(child => {
      const auth = getFormItemAuth(flowNode, child.id, disabled);
      return auth.view && auth.edit;
    });
    const row = copySubtableRow(dataSource[index], children, FaUtils.uuid(), tailFields);
    const newData = [...dataSource.slice(0, index + 1), row, ...dataSource.slice(index + 1)];
    setDataSource(newData);
    onChange?.(newData);
  };

  // 更新单元格数据
  const handleCellChange = (index: number, fieldName: string, value: any) => {
    const newData = dataSource.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [fieldName]: value } : row
    ));
    setDataSource(newData);
    onChange?.(newData);
  };

  // 根据字段类型渲染可编辑单元格
  const renderEditableCell = (child: Flow.FlowFormItem, record: any, index: number) => {
    const auth = getFormItemAuth(flowNode, child.id, disabled);
    if (!auth.view) return null;
    const fieldName = child.name || child.id;
    const value = record[fieldName];
    const onChange = (val: any) => handleCellChange(index, fieldName, val);

    switch (child.type) {
      case 'input':
        return <Input {...getTextInputProps(child)} disabled={!auth.edit} value={value} onChange={(e) => onChange(e.target.value)} placeholder={child.placeholder} />;
      
      case 'inputnumber':
        return <InputNumber {...getNumberInputProps(child)} disabled={!auth.edit} value={value} onChange={onChange} placeholder={child.placeholder} style={{ width: '100%' }} />;
      
      case 'textarea':
        return <Input.TextArea {...getTextInputProps(child)} disabled={!auth.edit} value={value} onChange={(e) => onChange(e.target.value)} placeholder={child.placeholder} rows={getTextAreaRows(child, 2)} />;
      
      case 'select':
        return <Select disabled={!auth.edit} value={value} onChange={onChange} placeholder={child.placeholder} style={{ width: '100%' }} options={child.options} mode={child.mode} allowClear />;
      
      case 'cascader':
        return <Cascader disabled={!auth.edit} value={value} onChange={onChange} placeholder={child.placeholder} style={{ width: '100%' }} />;
      
      case 'checkbox':
        return <Checkbox disabled={!auth.edit} checked={toBooleanFormValue(value)} onChange={(e) => onChange(e.target.checked)}>{child.placeholder || '勾选'}</Checkbox>;
      
      case 'radio':
        return <Radio.Group disabled={!auth.edit} value={value} onChange={(e) => onChange(e.target.value)} options={child.options} />;
      
      case 'datepicker':
        return (
          <DatePicker 
            disabled={!auth.edit}
            value={toTemporalValue('datepicker', value)}
            onChange={(date) => onChange(date ? date.format('YYYY-MM-DD') : undefined)} 
            style={{ width: '100%' }} 
          />
        );
      
      case 'timepicker':
        return (
          <TimePicker 
            disabled={!auth.edit}
            value={toTemporalValue('timepicker', value)}
            onChange={(time) => onChange(time ? time.format('HH:mm:ss') : undefined)} 
            style={{ width: '100%' }} 
          />
        );
      
      case 'switch':
        return <Switch disabled={!auth.edit} checked={toBooleanFormValue(value)} onChange={onChange} />;
      
      case 'rating':
        return <Rate disabled={!auth.edit} value={value} onChange={onChange} />;
      
      case 'slider':
        return <Slider disabled={!auth.edit} value={value} onChange={onChange} style={{ width: '100%' }} />;
      
      case 'colorpicker':
        return <ColorPicker disabled={!auth.edit} value={value} onChange={(_color, hex) => onChange(hex)} showText />;
      
      case 'biz_user_select':
        return <UserSearchSelect disabled={!auth.edit} value={value} onChange={onChange} placeholder={child.placeholder || '请选择用户'} />;
      
      case 'biz_dept_select':
        return <DepartmentCascade disabled={!auth.edit} value={value} onChange={onChange} placeholder={child.placeholder || '请选择部门'} />;
      
      default:
        return <Input disabled={!auth.edit} value={value} onChange={(e) => onChange(e.target.value)} placeholder={child.placeholder} />;
    }
  };

  const canEdit = !disabled && (formItem.children || []).some((child) => {
    const auth = getFormItemAuth(flowNode, child.id, disabled);
    return auth.view && auth.edit;
  });

  // 根据 formItem.children 生成表格列配置
  const columns: ColumnsType<any> = (() => {
    const childColumns = formItem.children?.filter((child) => getFormItemAuth(flowNode, child.id, disabled).view).map((child) => ({
      title: child.label || '列',
      dataIndex: child.name || child.id,
      key: child.id,
      width: typeof child.subtableColumnWidth === 'number' && Number.isFinite(child.subtableColumnWidth)
        ? Math.min(1200, Math.max(80, Math.round(child.subtableColumnWidth))) : 180,
      render: (_text: any, record: any, index: number) => renderEditableCell(child, record, index),
    })) || [];

    // 序号列
    const indexColumn: ColumnsType<any>[0] = {
      title: '序号',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_text, _record, index) => index + 1,
    };

    // 操作列
    const actionColumn: ColumnsType<any>[0] = {
      title: '操作',
      key: 'action',
      width: 160,
      align: 'center',
      render: (_text, _record, index) => (
        <Space size={0}>
          <Button disabled={!canEdit} type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(index)}>复制</Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这一行吗?"
            onConfirm={() => handleDelete(index)}
            okText="确定"
            cancelText="取消"
          >
            <Button disabled={!canEdit} type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    };

    return [indexColumn, ...childColumns, actionColumn];
  })();

  return (
    <div className='fa-flex-column' style={{ minWidth: 0, maxWidth: '100%' }}>
      <div className="text-sm font-medium" style={{ marginBottom: 8 }}>
        {formItem.label || '子表'}
      </div>

      <Table
        columns={columns}
        dataSource={dataSource}
        scroll={{ x: columns.reduce((total, column) => total + (typeof column.width === 'number' ? column.width : 180), 0) }}
        tableLayout="fixed"
        pagination={false}
        size="small"
        rowKey={(record) => record.id ?? record._key}
      />

      <Button
        disabled={!canEdit}
        icon={<PlusOutlined />}
        onClick={handleAdd}
        style={{ marginTop: 8 }}
      >
        添加
      </Button>
    </div>
  );
}
