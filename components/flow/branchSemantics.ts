/** FlowLong 1.2.7 以空条件列表识别兜底分支，conditionMode 不参与判断。 */
export function hasEmptyConditions(value: unknown): boolean {
  return value === undefined || value === null || (Array.isArray(value) && value.length === 0);
}
