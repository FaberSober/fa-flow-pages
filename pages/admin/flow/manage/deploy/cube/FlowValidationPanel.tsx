import { CheckCircleOutlined, ExclamationCircleOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Card, Tag, Typography } from 'antd';
import type { ProcessModelIssue, ProcessModelValidationResult } from '@features/fa-flow-pages/components/flow/modelValidation';

export default function FlowValidationPanel({ result, onLocate }: { result: ProcessModelValidationResult; onLocate: (issue: ProcessModelIssue) => void }) {
  return (
    <Card className="fa-flow-validation-panel" size="small" title={
      <span className="fa-flow-validation-title">
        {result.valid ? <CheckCircleOutlined className="fa-flow-validation-success" /> : <ExclamationCircleOutlined className="fa-flow-validation-error" />}
        {result.valid ? '流程校验通过' : '待修正问题'}
      </span>
    } extra={!result.valid && <Tag color="error">{result.issues.length === 20 ? '20+' : result.issues.length} 项</Tag>}>
      <Typography.Text type="secondary" className="fa-flow-validation-description">{result.valid ? '当前流程配置已通过校验' : '点击问题，定位节点及配置字段'}</Typography.Text>
      {!result.valid && (
        <ol className="fa-flow-validation-list">
          {result.issues.map((issue, index) => (
            <li key={`${issue.path}:${index}`}>
              <Button type="text" block onClick={() => onLocate(issue)} className="fa-flow-validation-item" title={`${issue.nodeName || '流程模型'}：${issue.message}\n${issue.fieldPath || issue.path || '模型内容'}`}>
                <span className="fa-flow-validation-item-content">
                  <span className="fa-flow-validation-item-summary">
                    <Typography.Text strong>{issue.nodeName || '流程模型'}</Typography.Text>
                    <Typography.Text type="danger">{issue.message}</Typography.Text>
                  </span>
                  <Typography.Text type="secondary" className="fa-flow-validation-path">{issue.fieldPath || issue.path || '模型内容'}</Typography.Text>
                </span>
                <RightOutlined className="fa-flow-validation-arrow" />
              </Button>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
