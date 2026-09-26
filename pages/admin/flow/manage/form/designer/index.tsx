import {
  AlignLeftOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  EyeOutlined,
  FontSizeOutlined,
  FormOutlined,
  InfoCircleOutlined,
  NumberOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { Alert, Button, Divider, Empty, Space, Splitter, Tag, Tooltip, Typography, theme } from 'antd';
import { useNavigate } from 'react-router-dom';

const basicControls = [
  { label: '单行文本', icon: <FontSizeOutlined /> },
  { label: '多行文本', icon: <AlignLeftOutlined /> },
  { label: '数字', icon: <NumberOutlined /> },
  { label: '日期', icon: <CalendarOutlined /> },
  { label: '单选 / 多选', icon: <CheckSquareOutlined /> },
];

const layoutControls = [
  { label: '分组', icon: <AppstoreOutlined /> },
  { label: '说明文字', icon: <InfoCircleOutlined /> },
];

/**
 * 流程表单设计器页面框架。控件交互和草稿持久化将在后续阶段接入。
 */
export default function FlowFormDesignerPage() {
  const navigate = useNavigate();
  const { token } = theme.useToken();

  return (
    <div className="fa-full fa-flex-column fa-bg-white">
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
        }}
      >
        <Button type="text" icon={<ArrowLeftOutlined />} aria-label="返回流程表单列表" onClick={() => navigate('/admin/flow/manage/form')} />
        <div style={{ minWidth: 0 }}>
          <Space size={8} wrap>
            <Typography.Title level={5} style={{ margin: 0 }}>
              新建流程表单
            </Typography.Title>
            <Tag color="blue">页面框架预览</Tag>
          </Space>
          <Typography.Text type="secondary">表单设计器工作区</Typography.Text>
        </div>
        <div style={{ flex: 1 }} />
        <Tooltip title="表单预览将在后续阶段开放">
          <span>
            <Button disabled icon={<EyeOutlined />}>
              预览
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="草稿保存将在后续阶段开放">
          <span>
            <Button type="primary" disabled icon={<SaveOutlined />}>
              保存草稿
            </Button>
          </span>
        </Tooltip>
      </header>

      <Alert banner showIcon type="info" message="当前为设计器页面框架，字段拖拽、预览和保存会分阶段接入。" />

      <Splitter style={{ flex: 1, minHeight: 0 }}>
        <Splitter.Panel defaultSize={248} min={216} max="32%" collapsible>
          <section aria-label="表单控件" style={{ height: '100%', overflow: 'auto', padding: 16, background: token.colorBgContainer }}>
            <Typography.Text strong>控件</Typography.Text>
            <Divider titlePlacement="start" plain style={{ margin: '16px 0 8px' }}>
              基础字段
            </Divider>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {basicControls.map((control) => (
                <Button key={control.label} block disabled icon={control.icon} style={{ textAlign: 'left' }}>
                  {control.label}
                </Button>
              ))}
            </Space>
            <Divider titlePlacement="start" plain style={{ margin: '20px 0 8px' }}>
              布局控件
            </Divider>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {layoutControls.map((control) => (
                <Button key={control.label} block disabled icon={control.icon} style={{ textAlign: 'left' }}>
                  {control.label}
                </Button>
              ))}
            </Space>
          </section>
        </Splitter.Panel>

        <Splitter.Panel>
          <main aria-label="表单画布" style={{ height: '100%', minWidth: 0, padding: 24, background: token.colorFillQuaternary }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                maxWidth: 920,
                margin: '0 auto',
                border: `1px dashed ${token.colorBorder}`,
                borderRadius: token.borderRadiusLG,
                background: token.colorBgContainer,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '16px 20px',
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <FormOutlined style={{ color: token.colorPrimary }} />
                <Typography.Text strong>表单画布</Typography.Text>
                <Tag>未命名表单</Tag>
              </div>
              <div style={{ display: 'grid', flex: 1, placeItems: 'center', padding: 24 }}>
                <Empty
                  image={<FormOutlined style={{ color: token.colorTextQuaternary, fontSize: 40 }} />}
                  description={
                    <Space direction="vertical" size={4}>
                      <Typography.Text strong>画布暂为空</Typography.Text>
                      <Typography.Text type="secondary">后续可从左侧选择控件，逐步搭建表单</Typography.Text>
                    </Space>
                  }
                />
              </div>
            </div>
          </main>
        </Splitter.Panel>

        <Splitter.Panel defaultSize={304} min={264} max="40%" collapsible>
          <aside aria-label="控件属性" style={{ height: '100%', overflow: 'auto', padding: 16, background: token.colorBgContainer }}>
            <Typography.Text strong>属性面板</Typography.Text>
            <Divider style={{ margin: '16px 0' }} />
            <Empty
              image={<InfoCircleOutlined style={{ color: token.colorTextQuaternary, fontSize: 32 }} />}
              description="选择画布中的控件后，可在这里设置属性"
            />
          </aside>
        </Splitter.Panel>
      </Splitter>
    </div>
  );
}
