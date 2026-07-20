
// import { EngineBackgroundLayer } from '../EngineBackgroundLayer'

interface Camera {
    x: number;
    y: number;
    zoom: number
}
interface NodeData {
    id: string;
    x: number;
    y: number;
    z?: number;
    width: number;
    height: number;
    label: string;
    data?: Record<string, string>
}

interface MapProps {
    nodes: NodeData[];
    initialCamera?: Camera;
}

/**
 * 
 * 1.完成地图渲染节点 
 * 
 */

export const MapCom = (props: MapProps) => {
    const { nodes } = props;

    return <div className="map">

        {/* <EngineBackgroundLayer /> */}

        {
            nodes.map((node) => {
                return <div key={node.id} style={{
                    position: 'absolute',
                    left: node.x,
                    top: node.y,
                    width: node.width,
                    height: node.height,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    border: '1px solid red',
                }}>
                    {node.label}
                </div>
            })
        }
    </div>
}