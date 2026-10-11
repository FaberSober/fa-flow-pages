/** 仅保存编辑字段，排除部署 ID、版本及服务端审计字段。 */
const fields = ['catagoryId', 'processKey', 'processName', 'processIcon', 'processType', 'instanceUrl', 'remark', 'useScope', 'processState', 'formType', 'formId', 'sort', 'modelContent'] as const;
export function flowSavePayload<T extends { id?: number; submitterPermission?: boolean }>(data: T) {
  const source = data as T & Record<string, unknown>;
  return { id: data.id, ...Object.fromEntries(fields.map(field => [field, source[field]])), submitterPermission: data.submitterPermission ?? false };
}
export function flowSaveSnapshot(data: Parameters<typeof flowSavePayload>[0]) {
  return JSON.stringify(flowSavePayload(data));
}
