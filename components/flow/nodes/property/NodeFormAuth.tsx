import { FaFlexRestLayout, PageLoading, useApiLoading } from '@fa/ui';
import { FaFormItemsDecoratorTypes, FaFormItemsFieldTypes } from '@features/fa-flow-pages/components/form/config';
import { getFormItemAuth } from '@features/fa-flow-pages/components/form/utils';
import { Checkbox } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { flowFormApi } from '@/services';
import { Flow, Flw } from '@/types';
import { useWorkFlowStore } from '../../stores/useWorkFlowStore';
import './index.scss';

export interface NodeFormAuthProps {
  node: Flw.Node;
}

function collectFormItems(items: Flow.FlowFormItem[]): Flow.FlowFormItem[] {
  const result: Flow.FlowFormItem[] = [];

  const collect = (children: Flow.FlowFormItem[]) => {
    children.forEach((item) => {
      if (FaFormItemsFieldTypes.includes(item.type)) {
        result.push(item);
        return;
      }
      if (item.type === 'high_subtable') {
        result.push(item);
        item.children?.forEach((child) => {
          if (FaFormItemsFieldTypes.includes(child.type)) {
            result.push({
              ...child,
              label: `[${item.label || '子表'}]-${child.label || '字段'}`,
            });
          }
        });
        return;
      }
      if (FaFormItemsDecoratorTypes.includes(item.type)) return;
      if (item.children) collect(item.children);
    });
  };

  collect(items);
  return result;
}

export default function NodeFormAuth({ node }: NodeFormAuthProps) {
  const readOnly = useWorkFlowStore((state) => state.readOnly);
  const flowProcess = useWorkFlowStore((state) => state.flowProcess);
  const updateNode = useWorkFlowStore((state) => state.updateNode);
  const [formItems, setFormItems] = useState<Flow.FlowFormItem[]>([]);
  const [formLoaded, setFormLoaded] = useState(false);

  const loading = useApiLoading(flowFormApi.getUrl(`getById/${flowProcess?.formId}`));

  useEffect(() => {
    let cancelled = false;
    setFormLoaded(false);
    setFormItems([]);

    if (!flowProcess?.id || !flowProcess?.formId) {
      setFormLoaded(true);
      return () => {
        cancelled = true;
      };
    }

    let loaded = false;
    flowFormApi
      .getById(flowProcess.formId)
      .then((res) => {
        if (cancelled) return;
        const config = res.data.config;
        const items = config?.items?.length ? config.items : Object.values(config?.formItemMap || {});
        setFormItems(collectFormItems(items));
        loaded = true;
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('加载流程表单失败:', error);
          setFormItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setFormLoaded(loaded);
      });

    return () => {
      cancelled = true;
    };
  }, [flowProcess?.id, flowProcess?.formId]);

  useEffect(() => {
    if (!formLoaded) return;
    const current = node.extendConfig?.formAuth;
    if (!current) return;

    const validIds = new Set(formItems.map((item) => item.id));
    const formAuth = Object.fromEntries(Object.entries(current).filter(([id]) => validIds.has(id)));
    if (Object.keys(formAuth).length === Object.keys(current).length) return;

    const extendConfig = { ...node.extendConfig };
    if (Object.keys(formAuth).length > 0) extendConfig.formAuth = formAuth;
    else delete extendConfig.formAuth;
    updateNode({ ...node, extendConfig });
  }, [formItems, formLoaded, node, updateNode]);

  const formAuth = useMemo(() => {
    const map: Record<string, Flw.NodeExtendConfigFormAuth> = {};
    formItems.forEach((item) => {
      const auth = getFormItemAuth(node, item.id);
      map[item.id] = {
        name: item.label,
        view: auth.view,
        edit: auth.edit,
        required: auth.required,
      };
    });
    return map;
  }, [formItems, node]);

  function handleFormAuthChange(formAuthNew: Record<string, Flw.NodeExtendConfigFormAuth>) {
    updateNode({
      ...node,
      extendConfig: {
        ...node.extendConfig,
        formAuth: formAuthNew,
      },
    });
  }

  function processItemChecked(item: Flw.NodeExtendConfigFormAuth, perm: 'view' | 'edit' | 'required', checked: boolean) {
    if (perm === 'view' && !checked) {
      item.edit = false;
      item.required = false;
    }
    if (perm === 'edit' && !checked) item.required = false;
    if (perm === 'edit' && checked) item.view = true;
    if (perm === 'required' && checked) {
      item.view = true;
      item.edit = true;
    }
  }

  function handleCheckAllChange(perm: 'view' | 'edit' | 'required', checked: boolean) {
    const formAuthNew = Object.fromEntries(
      formItems.map((item) => {
        const auth = { ...formAuth[item.id] };
        auth[perm] = checked;
        processItemChecked(auth, perm, checked);
        return [item.id, auth];
      }),
    );
    handleFormAuthChange(formAuthNew);
  }

  function handleCheckChange(itemId: string, perm: 'view' | 'edit' | 'required', checked: boolean) {
    const item = formItems.find((formItem) => formItem.id === itemId);
    if (!item) return;
    const auth = { ...formAuth[itemId] };
    auth[perm] = checked;
    processItemChecked(auth, perm, checked);
    handleFormAuthChange({ ...formAuth, [itemId]: auth });
  }

  const allViewChecked = formItems.length > 0 && formItems.every((item) => formAuth[item.id]?.view);
  const allViewIndeterminate = formItems.some((item) => formAuth[item.id]?.view) && !allViewChecked;
  const allEditChecked = formItems.length > 0 && formItems.every((item) => formAuth[item.id]?.edit);
  const allEditIndeterminate = formItems.some((item) => formAuth[item.id]?.edit) && !allEditChecked;
  const allRequiredChecked = formItems.length > 0 && formItems.every((item) => formAuth[item.id]?.required);
  const allRequiredIndeterminate = formItems.some((item) => formAuth[item.id]?.required) && !allRequiredChecked;

  if (loading) return <PageLoading />;
  return (
    <div className="fa-flex-column fa-full">
      <div className="fa-form-auth-header">
        <div className="fa-form-auth-header-tr" style={{ flex: 1 }}>
          表单字段
        </div>
        <div className="fa-form-auth-header-tr" style={{ width: 80 }}>
          <Checkbox
            disabled={readOnly}
            onChange={(e) => handleCheckAllChange('view', e.target.checked)}
            indeterminate={allViewIndeterminate}
            checked={allViewChecked}
          >
            查看
          </Checkbox>
        </div>
        <div className="fa-form-auth-header-tr" style={{ width: 80 }}>
          <Checkbox
            disabled={readOnly}
            onChange={(e) => handleCheckAllChange('edit', e.target.checked)}
            indeterminate={allEditIndeterminate}
            checked={allEditChecked}
          >
            编辑
          </Checkbox>
        </div>
        <div className="fa-form-auth-header-tr" style={{ width: 80 }}>
          <Checkbox
            disabled={readOnly}
            onChange={(e) => handleCheckAllChange('required', e.target.checked)}
            indeterminate={allRequiredIndeterminate}
            checked={allRequiredChecked}
          >
            必填
          </Checkbox>
        </div>
      </div>
      <FaFlexRestLayout>
        {formItems.length === 0 && <div className="fa-flex-1 fa-flex-center fa-text-light100">暂无可配置表单字段</div>}
        {formItems.map((item) => {
          const viewChecked = formAuth[item.id]?.view || false;
          const editChecked = formAuth[item.id]?.edit || false;
          const requiredChecked = formAuth[item.id]?.required || false;
          return (
            <div key={item.id} className="fa-form-auth-body-tr">
              <div className="fa-form-auth-body-td" style={{ flex: 1 }}>
                {item.label}
              </div>
              <div className="fa-form-auth-body-td" style={{ width: 80 }}>
                <Checkbox disabled={readOnly} checked={viewChecked} onChange={(e) => handleCheckChange(item.id, 'view', e.target.checked)}>
                  查看
                </Checkbox>
              </div>
              <div className="fa-form-auth-body-td" style={{ width: 80 }}>
                <Checkbox disabled={readOnly} checked={editChecked} onChange={(e) => handleCheckChange(item.id, 'edit', e.target.checked)}>
                  编辑
                </Checkbox>
              </div>
              <div className="fa-form-auth-body-td" style={{ width: 80 }}>
                <Checkbox disabled={readOnly} checked={requiredChecked} onChange={(e) => handleCheckChange(item.id, 'required', e.target.checked)}>
                  必填
                </Checkbox>
              </div>
            </div>
          );
        })}
      </FaFlexRestLayout>
    </div>
  );
}
