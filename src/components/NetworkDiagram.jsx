import { useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

const NetworkDiagram = ({ networkData, traceResult }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Verifica si IP está dentro de una red
  const isIPInNetwork = (ip, network, mask) => {
    if (!ip || !network || !mask) return false;
    const maskBits = parseInt(mask.replace('/', ''));
    const ipParts = ip.split('.').map(Number);
    const networkParts = network.split('.').map(Number);
    const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const networkNum = (networkParts[0] << 24) | (networkParts[1] << 16) | (networkParts[2] << 8) | networkParts[3];
    const maskNum = (-1 << (32 - maskBits)) >>> 0;
    return (ipNum & maskNum) === (networkNum & maskNum);
  };

  useEffect(() => {
    console.log('networkData recibido:', networkData);
    console.log('traceResult recibido:', traceResult);

    if (!networkData || networkData.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Nodos únicos
    const equipos = [...new Set(networkData.map(r => r.Equipo))];
    console.log('Equipos únicos:', equipos);

    const newNodes = equipos.map((equipo, index) => {
      const angle = (index / equipos.length) * 2 * Math.PI;
      const radius = 250;
      const x = 400 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);

      const isInPath = traceResult?.hops?.some(
        hop => hop.currentEquipment === equipo || hop.nextEquipment === equipo
      );

      return {
        id: equipo,
        data: { label: equipo },
        position: { x, y },
        style: {
          background: isInPath ? '#3b82f6' : '#f3f4f6',
          color: isInPath ? '#ffffff' : '#1f2937',
          border: isInPath ? '3px solid #1e40af' : '2px solid #d1d5db',
          borderRadius: '8px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: isInPath ? 'bold' : 'normal',
        },
      };
    });

    // Crear edges de prueba para asegurarnos que ReactFlow los dibuje
    const edgesMap = new Map();

    networkData.forEach(net => {
      networkData.forEach(otherNet => {
        if (net.Equipo !== otherNet.Equipo && net.VLAN === otherNet.VLAN) {
          if (isIPInNetwork(otherNet.IP, net.RED, net.Mascara) || isIPInNetwork(net.IP, otherNet.RED, otherNet.Mascara)) {
            const edgeId = `${net.Equipo}-${otherNet.Equipo}`;
            const reverseEdgeId = `${otherNet.Equipo}-${net.Equipo}`;

            if (!edgesMap.has(edgeId) && !edgesMap.has(reverseEdgeId)) {
              edgesMap.set(edgeId, {
                id: edgeId,
                source: net.Equipo,
                target: otherNet.Equipo,
                animated: false,
                style: { stroke: '#d1d5db', strokeWidth: 2 },
              });
            }
          }
        }
      });
    });

    // Resaltar ruta del traceroute
    if (traceResult?.hops) {
      traceResult.hops.forEach(hop => {
        if (hop.nextEquipment) {
          const edgeId = `${hop.currentEquipment}-${hop.nextEquipment}`;
          const reverseEdgeId = `${hop.nextEquipment}-${hop.currentEquipment}`;
          if (edgesMap.has(edgeId)) {
            edgesMap.get(edgeId).animated = true;
            edgesMap.get(edgeId).style = { stroke: '#3b82f6', strokeWidth: 3 };
          } else if (edgesMap.has(reverseEdgeId)) {
            edgesMap.get(reverseEdgeId).animated = true;
            edgesMap.get(reverseEdgeId).style = { stroke: '#3b82f6', strokeWidth: 3 };
          }
        }
      });
    }

    // Logs finales
    console.log('Nodos generados:', newNodes);
    console.log('Edges generados:', Array.from(edgesMap.values()));

    setNodes(newNodes);
    setEdges(Array.from(edgesMap.values()));
  }, [networkData, traceResult]);

  if (!networkData || networkData.length === 0) {
    return (
      <div className="w-full h-96 bg-white rounded-lg shadow-md flex items-center justify-center">
        <p className="text-gray-500">Carga un archivo CSV de redes para ver el diagrama</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Diagrama de Red</h2>
      <div className="w-full h-96 border border-gray-200 rounded-lg overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#f3f4f6" gap={16} />
          <Controls />
          <MiniMap nodeColor={(node) => node.style?.background || '#f3f4f6'} maskColor="rgba(0,0,0,0.1)" />
        </ReactFlow>
      </div>
      {traceResult?.success && (
        <div className="mt-3 text-sm text-gray-600">
          <span className="inline-block w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
          Los nodos y conexiones en azul muestran la ruta del traceroute
        </div>
      )}
    </div>
  );
};

export default NetworkDiagram;
