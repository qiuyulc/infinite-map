import { useCallback, useMemo, useRef, useState } from 'react';
import './Slider.css';

type Props = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  /** aria-label */
  label: string;
  formatValue?: (v: number) => string;
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function roundToStep(v: number, min: number, step: number) {
  const n = Math.round((v - min) / step);
  return min + n * step;
}

export function Slider({ value, min, max, step = 1, onChange, label, formatValue }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);

  const percent = useMemo(() => {
    if (max <= min) return 0;
    return ((value - min) / (max - min)) * 100;
  }, [value, min, max]);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const t = clamp((clientX - r.left) / Math.max(1, r.width), 0, 1);
      const raw = min + t * (max - min);
      const snapped = roundToStep(raw, min, step);
      onChange(clamp(snapped, min, max));
    },
    [min, max, step, onChange]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      setActive(true);
      setFromClientX(e.clientX);
    },
    [setFromClientX]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!active && (e.buttons & 1) === 0) return;
      setFromClientX(e.clientX);
    },
    [active, setFromClientX]
  );

  const onPointerUp = useCallback(() => setActive(false), []);
  const onPointerCancel = useCallback(() => setActive(false), []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const dv =
        e.key === 'ArrowRight' || e.key === 'ArrowUp'
          ? step
          : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
            ? -step
            : 0;
      if (dv !== 0) {
        e.preventDefault();
        onChange(clamp(roundToStep(value + dv, min, step), min, max));
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        onChange(min);
      }
      if (e.key === 'End') {
        e.preventDefault();
        onChange(max);
      }
    },
    [value, min, max, step, onChange]
  );

  const ariaValueText = formatValue ? formatValue(value) : String(value);
  const showTip = active || hover || focus;

  return (
    <div className="im-slider">
      <div
        className="im-slider-track"
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={ariaValueText}
        onKeyDown={onKeyDown}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
      >
        <div className="im-slider-rail" />
        <div className="im-slider-fill" style={{ width: `${percent}%` }} />
        <div className="im-slider-thumb" style={{ left: `${percent}%` }} />
        <div className={`im-slider-tip ${showTip ? 'is-visible' : ''}`} style={{ left: `${percent}%` }}>
          {ariaValueText}
        </div>
      </div>
    </div>
  );
}

