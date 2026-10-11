/** Local parent scope: guard destructive actions without touching cached tab navigation. */
export function createFlowLeaveScope() {
  const guards = new Set<() => Promise<boolean>>();
  let pending = false;
  return {
    register(guard: () => Promise<boolean>) {
      guards.add(guard);
      return () => { guards.delete(guard); };
    },
    async run(action: () => void | Promise<void>) {
      if (pending) return;
      pending = true;
      try {
        for (const guard of guards) {
          if (!await guard()) return;
        }
        await action();
      } finally {
        pending = false;
      }
    },
  };
}
