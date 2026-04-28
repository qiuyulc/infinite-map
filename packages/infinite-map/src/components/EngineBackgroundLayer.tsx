import { memo } from 'react';
import type { EngineStore } from '../engine';
import { useEngineSelector } from '../engine';
import { BackgroundDotsWorld } from './BackgroundDotsWorld';
import { BackgroundGridWorld } from './BackgroundGridWorld';

type Props = {
  store: EngineStore;
  backgroundMode: 'dots' | 'grid' | 'none';
  dotSpacing: number | 'auto';
  dotRadiusPx: number;
  dotAlpha: number;
  gridSpacing: number | 'auto';
  gridAlpha: number;
};

export const EngineBackgroundLayer = memo(function EngineBackgroundLayer({
  store,
  backgroundMode,
  dotSpacing,
  dotRadiusPx,
  dotAlpha,
  gridSpacing,
  gridAlpha,
}: Props) {
  const zoom = useEngineSelector(store, (s) => s.view.zoom, Object.is);

  if (backgroundMode === 'grid') {
    return <BackgroundGridWorld zoom={zoom} gridSpacing={gridSpacing} gridAlpha={gridAlpha} />;
  }
  if (backgroundMode === 'dots') {
    return <BackgroundDotsWorld zoom={zoom} dotSpacing={dotSpacing} dotRadiusPx={dotRadiusPx} dotAlpha={dotAlpha} />;
  }
  return null;
});

