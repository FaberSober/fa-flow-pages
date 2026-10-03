import type { Flow } from '@/types';
import { FileSearchOutlined } from '@ant-design/icons';
import { FaFullContentModal, FaHref } from '@fa/ui';
import { useState } from 'react';
import FlowFormDataTable from '../cube/data/FlowFormDataTable';
import FormSimpleTable from '../../../view/form/simpleTable/FormSimpleTable';


export interface FlowFormViewDataDrawerProps {
  item: Flow.FlowForm;
}

/**
 * @author xu.pengfei
 * @date 2025-12-19 13:44:06
 */
export default function FlowFormViewDataDrawer({ item }: FlowFormViewDataDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <span>
      <FaFullContentModal
        triggerDom={<FaHref text="数据" icon={<FileSearchOutlined />} />}
        title="查询数据"
        open={open}
        onOpenChange={setOpen}
        showOk={false}
        showCancel={false}
      >
        {open && (
          <div className='fa-full-content-p12'>
            {/* 流程类型表格 */}
            {item.flowProcessId && <FlowFormDataTable flowForm={item} />}
            {/* 普通类型表格 */}
            {!item.flowProcessId && <FormSimpleTable flowForm={item} />}
          </div>
        )}
      </FaFullContentModal>
    </span>
  );
}
