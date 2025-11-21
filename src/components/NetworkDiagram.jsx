import { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import NodeEditor from './NodeEditor';
import EdgeConfigModal from './EdgeConfigModal';

const NetworkDiagram = ({ networkData, traceResult, onNetworkUpdate, routingData, onRoutingUpdate }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [isEdgeConfigOpen, setIsEdgeConfigOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState(null);

  // Estado para edges manuales que persisten
  const [manualEdges, setManualEdges] = useState(() => {
    try {
      const stored = localStorage.getItem('manualEdges');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Guardar edges manuales en localStorage
  useEffect(() => {
    localStorage.setItem('manualEdges', JSON.stringify(manualEdges));
  }, [manualEdges]);

  // Manejar conexión de nodos
  const onConnect = useCallback(
    (params) => {
      if (isEditMode) {
        // Guardar la conexión pendiente y abrir el modal de configuración
        setPendingConnection(params);
        setIsEdgeConfigOpen(true);
      }
    },
    [isEditMode]
  );

  // Guardar rutas y crear edge
  const handleSaveRoutes = (newRoutes) => {
    if (onRoutingUpdate && newRoutes.length > 0) {
      // Agregar las nuevas rutas
      onRoutingUpdate([...routingData, ...newRoutes]);
    }

    // Crear el edge manual y guardarlo
    if (pendingConnection) {
      const newEdge = {
        id: `${pendingConnection.source}-${pendingConnection.target}`,
        source: pendingConnection.source,
        target: pendingConnection.target,
        animated: false,
        style: { stroke: '#d1d5db', strokeWidth: 2 }
      };

      // Agregar a edges manuales si no existe
      setManualEdges((prev) => {
        const exists = prev.some(e =>
          (e.source === newEdge.source && e.target === newEdge.target) ||
          (e.source === newEdge.target && e.target === newEdge.source)
        );
        return exists ? prev : [...prev, newEdge];
      });
    }

    // Limpiar y cerrar
    setPendingConnection(null);
    setIsEdgeConfigOpen(false);
  };

  // Agregar nuevo nodo
  const addNewNode = () => {
    setEditingNode(null);
    setIsEditorOpen(true);
  };

  // Editar nodo seleccionado
  const editSelectedNode = () => {
    if (!selectedNode) {
      alert('Selecciona un nodo primero');
      return;
    }
    setEditingNode(selectedNode);
    setIsEditorOpen(true);
  };

  // Guardar cambios del editor
  const handleSaveNode = (data) => {
    const { oldName, newName, interfaces, routes } = data;

    if (oldName && oldName !== newName) {
      // Renombrar nodo en el diagrama
      setNodes((nds) =>
        nds.map((node) =>
          node.id === oldName
            ? { ...node, id: newName, data: { label: newName } }
            : node
        )
      );

      // Actualizar edges
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          source: edge.source === oldName ? newName : edge.source,
          target: edge.target === oldName ? newName : edge.target,
        }))
      );

      // Actualizar networkData
      if (onNetworkUpdate) {
        const updatedNetwork = networkData.filter(net => net.Equipo !== oldName);
        onNetworkUpdate([...updatedNetwork, ...interfaces]);
      }

      // Actualizar routingData
      if (onRoutingUpdate) {
        const updatedRoutes = routingData.filter(route => route.Equipo !== oldName);
        onRoutingUpdate([...updatedRoutes, ...routes]);
      }

      setSelectedNode(newName);
    } else if (!oldName) {
      // Nuevo nodo
      const newNode = {
        id: newName,
        data: { label: newName },
        position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 100 },
        style: {
          background: '#f3f4f6',
          color: '#1f2937',
          border: '2px solid #d1d5db',
          borderRadius: '8px',
          padding: '12px 20px',
          fontSize: '14px',
        },
      };

      setNodes((nds) => [...nds, newNode]);

      // Actualizar networkData
      if (onNetworkUpdate) {
        onNetworkUpdate([...networkData, ...interfaces]);
      }

      // Actualizar routingData
      if (onRoutingUpdate) {
        onRoutingUpdate([...routingData, ...routes]);
      }
    } else {
      // Editar nodo existente (mismo nombre)
      if (onNetworkUpdate) {
        const updatedNetwork = networkData.filter(net => net.Equipo !== oldName);
        onNetworkUpdate([...updatedNetwork, ...interfaces]);
      }

      if (onRoutingUpdate) {
        const updatedRoutes = routingData.filter(route => route.Equipo !== oldName);
        onRoutingUpdate([...updatedRoutes, ...routes]);
      }
    }
  };

  // Eliminar nodo seleccionado
  const deleteSelectedNode = () => {
    if (!selectedNode) {
      alert('Selecciona un nodo primero');
      return;
    }

    if (!confirm(`¿Eliminar el nodo ${selectedNode}?`)) return;

    setNodes((nds) => nds.filter((n) => n.id !== selectedNode));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode && e.target !== selectedNode));

    // Eliminar edges manuales asociados al nodo
    setManualEdges((prev) => prev.filter(e => e.source !== selectedNode && e.target !== selectedNode));

    // Actualizar networkData
    if (onNetworkUpdate) {
      const updatedNetwork = networkData.filter(net => net.Equipo !== selectedNode);
      onNetworkUpdate(updatedNetwork);
    }

    // Actualizar routingData
    if (onRoutingUpdate) {
      const updatedRoutes = routingData.filter(route => route.Equipo !== selectedNode);
      onRoutingUpdate(updatedRoutes);
    }

    setSelectedNode(null);
  };

  // Manejar selección de nodo
  const onNodeClick = useCallback((event, node) => {
    if (isEditMode) {
      setSelectedNode(node.id);
    }
  }, [isEditMode]);

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
    //console.log('networkData recibido:', networkData);
    //console.log('traceResult recibido:', traceResult);

    if (!networkData || networkData.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Nodos únicos
    const equipos = [...new Set(networkData.map(r => r.Equipo))];
    //console.log('Equipos únicos:', equipos);

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
          if (isIPInNetwork(otherNet.IP, net.Red, net.Mascara) || isIPInNetwork(net.IP, otherNet.Red, otherNet.Mascara)) {
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

    // Combinar edges automáticos con edges manuales PRIMERO
    const autoEdges = Array.from(edgesMap.values());

    // Filtrar edges manuales que todavía existen (ambos nodos existen)
    const validManualEdges = manualEdges.filter(edge =>
      equipos.includes(edge.source) && equipos.includes(edge.target)
    );

    // Combinar, evitando duplicados - CREAR COPIAS para evitar mutaciones
    const combinedEdges = [...autoEdges];
    validManualEdges.forEach(manualEdge => {
      const isDuplicate = autoEdges.some(autoEdge =>
        (autoEdge.source === manualEdge.source && autoEdge.target === manualEdge.target) ||
        (autoEdge.source === manualEdge.target && autoEdge.target === manualEdge.source)
      );
      if (!isDuplicate) {
        // Crear una copia del edge manual con estilo base reseteado
        combinedEdges.push({
          ...manualEdge,
          animated: false,
          style: { stroke: '#d1d5db', strokeWidth: 2 }
        });
      }
    });

    // Resaltar ruta del traceroute DESPUÉS de combinar todos los edges
    if (traceResult?.hops) {
      traceResult.hops.forEach(hop => {
        if (hop.nextEquipment) {
          // Buscar el índice del edge en los edges combinados
          const edgeIndex = combinedEdges.findIndex(edge =>
            (edge.source === hop.currentEquipment && edge.target === hop.nextEquipment) ||
            (edge.source === hop.nextEquipment && edge.target === hop.currentEquipment)
          );

          if (edgeIndex !== -1) {
            // Crear un nuevo objeto edge con el resaltado en lugar de mutar
            combinedEdges[edgeIndex] = {
              ...combinedEdges[edgeIndex],
              animated: true,
              style: { stroke: '#3b82f6', strokeWidth: 3 }
            };
          }
        }
      });
    }

    // Actualizar manualEdges si algunos se volvieron inválidos
    if (validManualEdges.length !== manualEdges.length) {
      setManualEdges(validManualEdges);
    }

    // Logs finales
    //console.log('Nodos generados:', newNodes);
    //console.log('Edges automáticos:', autoEdges);
    //console.log('Edges manuales:', validManualEdges);
    //console.log('Edges combinados:', combinedEdges);

    setNodes(newNodes);
    setEdges(combinedEdges);
  }, [networkData, traceResult, manualEdges]);

  if (!networkData || networkData.length === 0) {
    return (
      <div className="w-full h-96 bg-white rounded-lg shadow-md flex items-center justify-center">
        <p className="text-gray-500">Carga un archivo CSV de redes para ver el diagrama</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Diagrama de Red</h2>
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isEditMode
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {isEditMode ? 'Modo Vista' : 'Modo Edición'}
        </button>
      </div>

      {isEditMode && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={addNewNode}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Agregar Nodo
          </button>
          <button
            onClick={editSelectedNode}
            disabled={!selectedNode}
            className="px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar {selectedNode ? `"${selectedNode}"` : 'Nodo'}
          </button>
          <button
            onClick={deleteSelectedNode}
            disabled={!selectedNode}
            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar {selectedNode ? `"${selectedNode}"` : 'Nodo'}
          </button>
          {selectedNode && (
            <div className="ml-auto bg-blue-50 px-3 py-2 rounded-md text-sm text-blue-800">
              Seleccionado: <strong>{selectedNode}</strong>
            </div>
          )}
        </div>
      )}

      <div className="w-full h-96 border border-gray-200 rounded-lg overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodesDraggable={isEditMode}
          nodesConnectable={isEditMode}
          elementsSelectable={isEditMode}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#f3f4f6" gap={16} />
          <Controls />
          <MiniMap nodeColor={(node) => node.style?.background || '#f3f4f6'} maskColor="rgba(0,0,0,0.1)" />
          {isEditMode && (
            <Panel position="top-center" className="bg-yellow-100 px-4 py-2 rounded-md text-sm text-yellow-800 font-medium">
              Modo Edición: Arrastra nodos, conecta equipos, crea o elimina elementos
            </Panel>
          )}
        </ReactFlow>
      </div>
      {traceResult?.success && (
        <div className="mt-3 text-sm text-gray-600">
          <span className="inline-block w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
          Los nodos y conexiones en azul muestran la ruta del traceroute
        </div>
      )}

      {/* Modal de edición de nodo */}
      <NodeEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        equipmentName={editingNode}
        networkData={networkData}
        routingData={routingData}
        onSave={handleSaveNode}
      />

      {/* Modal de configuración de enrutamiento */}
      <EdgeConfigModal
        isOpen={isEdgeConfigOpen}
        onClose={() => {
          setIsEdgeConfigOpen(false);
          setPendingConnection(null);
        }}
        sourceNode={pendingConnection?.source}
        targetNode={pendingConnection?.target}
        networkData={networkData}
        routingData={routingData}
        onSaveRoutes={handleSaveRoutes}
      />
    </div>
  );
};

export default NetworkDiagram;
