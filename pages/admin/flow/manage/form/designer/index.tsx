import { Navigate } from 'react-router-dom';

/** 兼容旧设计器地址，统一回到已有表单管理入口。 */
export default function FlowFormDesignerRedirect() {
  return <Navigate to="/admin/flow/manage/form" replace />;
}
