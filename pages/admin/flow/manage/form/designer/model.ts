export type DataControlType = 'text' | 'textarea' | 'number' | 'date' | 'singleSelect' | 'multiSelect';
export type LayoutControlType = 'group' | 'description';
export type DesignerControlType = DataControlType | LayoutControlType;
export type LogicalDataType = 'string' | 'number' | 'date' | 'choice' | 'multi-choice';

export interface DataDesignerItem {
  id: string;
  kind: 'field';
  control: DataControlType;
  fieldKey: string;
  dataType: LogicalDataType;
  label: string;
  required: boolean;
  defaultValue: string;
  options: string[];
}

export interface LayoutDesignerItem {
  id: string;
  kind: 'layout';
  control: LayoutControlType;
  label: string;
}

export type DesignerItem = DataDesignerItem | LayoutDesignerItem;

type ControlDefinition = { label: string; kind: 'field'; dataType: LogicalDataType } | { label: string; kind: 'layout' };

export const DESIGNER_CONTROLS = {
  text: { label: '单行文本', kind: 'field', dataType: 'string' },
  textarea: { label: '多行文本', kind: 'field', dataType: 'string' },
  number: { label: '数字', kind: 'field', dataType: 'number' },
  date: { label: '日期', kind: 'field', dataType: 'date' },
  singleSelect: { label: '单选', kind: 'field', dataType: 'choice' },
  multiSelect: { label: '多选', kind: 'field', dataType: 'multi-choice' },
  group: { label: '分组', kind: 'layout' },
  description: { label: '说明文字', kind: 'layout' },
} as const satisfies Record<DesignerControlType, ControlDefinition>;

export const BASIC_DATA_CONTROLS: DataControlType[] = ['text', 'textarea', 'number', 'date', 'singleSelect', 'multiSelect'];
export const LAYOUT_CONTROLS: LayoutControlType[] = ['group', 'description'];

export function isDesignerControlType(value: unknown): value is DesignerControlType {
  return typeof value === 'string' && Object.hasOwn(DESIGNER_CONTROLS, value);
}

function isDataControlType(control: DesignerControlType): control is DataControlType {
  return control === 'text' || control === 'textarea' || control === 'number' || control === 'date' || control === 'singleSelect' || control === 'multiSelect';
}

export function createDesignerItem(control: DesignerControlType, items: DesignerItem[]): DesignerItem {
  const definition = DESIGNER_CONTROLS[control];
  const sequence = items.filter((item) => item.control === control).length + 1;
  const id = crypto.randomUUID().replaceAll('-', '');
  const base = { id: `designer_${id}`, label: `${definition.label} ${sequence}` };

  if (isDataControlType(control)) {
    const dataType = DESIGNER_CONTROLS[control].dataType;
    return {
      ...base,
      kind: 'field',
      control,
      fieldKey: `field_${id}`,
      dataType,
      required: false,
      defaultValue: '',
      options: dataType === 'choice' || dataType === 'multi-choice' ? ['选项一', '选项二'] : [],
    };
  }

  return { ...base, kind: 'layout', control };
}

export function getControlLabel(control: DesignerControlType): string {
  return DESIGNER_CONTROLS[control].label;
}

/** 编辑时保留原始换行，预览和选择器使用有效选项。 */
export function getDesignerOptions(item: DataDesignerItem): string[] {
  return item.options.map((option) => option.trim()).filter(Boolean);
}
