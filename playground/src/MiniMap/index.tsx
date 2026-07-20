import { MapCom } from './components/map'
import './index.css'
export const MiniMap = () => {
    const nodes = [
        {
            id: '1',
            x: 100,
            y: 100,
            z: 0,
            width: 100,
            height: 100,
            label: '节点1'
        }
    ]
    return <div className="minimap">
        <MapCom nodes={nodes} />
    </div>
}

