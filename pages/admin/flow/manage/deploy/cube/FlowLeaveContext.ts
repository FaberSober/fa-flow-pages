import { createContext } from 'react';
import type { createFlowLeaveScope } from './flowLeaveScope';

export const FlowLeaveContext = createContext<ReturnType<typeof createFlowLeaveScope> | null>(null);
