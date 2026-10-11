/** 入线与箭头共享 SVG 的 x=5 中心轴，避免分别定位产生缩放偏差。 */
export default function BranchEntryConnector() {
  return (
    <div className="branch-entry-connector" aria-hidden="true">
      <svg width="10" height="100%" overflow="hidden" aria-hidden="true" focusable="false">
        <line x1="5" x2="5" y1="0" y2="100%" transform="translate(0 -8)" stroke="currentColor" strokeWidth="2" />
        <svg y="100%" width="10" height="8" viewBox="0 0 10 8" overflow="visible" aria-hidden="true" focusable="false">
          <path d="M0 0H10L5 8Z" transform="translate(0 -8)" fill="currentColor" />
        </svg>
      </svg>
    </div>
  );
}
