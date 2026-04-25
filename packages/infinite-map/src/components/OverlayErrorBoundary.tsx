import React from 'react';
import type { ReactNode } from 'react';
import type { EditorErrorInfo } from '../editor/types';

/**
 * 插件 overlay 错误边界：
 * - 单个 overlay 报错不会拖垮整棵树
 * - 错误通过 onEditorError 上报
 */
export class OverlayErrorBoundary extends React.Component<
  {
    info: Omit<EditorErrorInfo, 'kind' | 'name'>;
    onError?: (err: unknown, info: EditorErrorInfo) => void;
    children: ReactNode;
  },
  { hasError: boolean }
> {
  state: { hasError: boolean } = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    this.props.onError?.(err, { kind: 'overlay', name: 'render', ...this.props.info });
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

