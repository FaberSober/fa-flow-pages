/** Check freshness again after an asynchronous leave confirmation. */
export async function commitFlowRefresh(isCurrent: () => boolean, protect: (action: () => void) => Promise<void>, apply: () => void): Promise<boolean> {
  if (!isCurrent()) return false;
  let applied = false;
  await protect(() => {
    if (!isCurrent()) return;
    apply();
    applied = true;
  });
  return applied;
}
