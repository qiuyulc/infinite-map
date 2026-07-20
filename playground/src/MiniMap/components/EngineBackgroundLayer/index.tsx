
//地图背景层
import './index.css'
export const EngineBackgroundLayer = (props: {
    dotSpacing: number | 'auto';
    dotRadiusPx: number;
    dotAlpha: number;
    gridSpacing: number | 'auto';
    gridAlpha: number;
    zIndex?: number;
}) => {

    const { dotSpacing, dotRadiusPx, dotAlpha, gridSpacing, gridAlpha, zIndex } = props;



    return <div className="engine-background-layer"></div>
}