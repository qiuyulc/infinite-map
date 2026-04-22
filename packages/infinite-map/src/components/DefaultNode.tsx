import type { CSSProperties, ReactNode } from 'react';
import type { NodeData } from '../core/types';
import './DefaultNode.css';

export type DefaultNodeProps = {
  n: NodeData;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  /**
   * 是否显示默认 meta 信息（坐标等）
   * - 作为组件库默认值建议关闭，避免出现“调试信息”
   */
  showMeta?: boolean;
};

export function DefaultNode({ n, className, style, children, showMeta = false }: DefaultNodeProps) {
  const base = n.kind === 'group' ? 'im-node im-group' : 'im-node';
  const cls = className ? `${base} ${className}` : base;
  return (
    <div
      className={cls}
      style={{
        width: n.width,
        height: n.height,
        ...style,
      }}
    >
      <div className="im-node-title">{n.label ?? (n.kind === 'group' ? 'Group' : n.id)}</div>
      {showMeta ? (
        <div className="im-node-meta">
          ({Math.round(n.x)}, {Math.round(n.y)})
        </div>
      ) : null}
      {children ? <div className="im-node-content">{children}</div> : null}
    </div>
  );
}
