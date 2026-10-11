/** Register only for an active editor; inspect current state when leaving. */
export function protectFlowUnload(target: Pick<Window, 'addEventListener' | 'removeEventListener'>, shouldProtect: () => boolean) {
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (!shouldProtect()) return;
    event.preventDefault();
    event.returnValue = '';
  };
  target.addEventListener('beforeunload', beforeUnload);
  return () => target.removeEventListener('beforeunload', beforeUnload);
}
