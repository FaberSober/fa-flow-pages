export type FlowPublishStage = 'saving' | 'deploying';

export class FlowPublishError extends Error {
  constructor(public stage: FlowPublishStage, cause: unknown) {
    super(stage === 'saving' ? '流程定义保存失败' : '流程定义已保存，但发布失败', { cause });
  }
}

/** A failed deployment can retry against the already saved definition. */
export async function publishFlow<T>({ needsSave, save, deploy, onSaved, onStage }: {
  needsSave: boolean;
  save: () => Promise<unknown>;
  deploy: () => Promise<T>;
  onSaved: () => void;
  onStage: (stage: FlowPublishStage) => void;
}): Promise<T> {
  let stage: FlowPublishStage = needsSave ? 'saving' : 'deploying';
  try {
    if (needsSave) {
      onStage('saving');
      await save();
      onSaved();
    }
    stage = 'deploying';
    onStage(stage);
    return await deploy();
  } catch (cause) {
    throw new FlowPublishError(stage, cause);
  }
}
