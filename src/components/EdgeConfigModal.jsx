import { useState, useEffect } from 'react';

/**
 * EdgeConfigModal Component
 * Modal para configurar el enrutamiento cuando se conectan dos nodos
 * Sugiere rutas automáticas basadas en las interfaces de ambos equipos
 */
const EdgeConfigModal = ({ isOpen, onClose, sourceNode, targetNode, networkData, routingData, onSaveRoutes }) => {
  const [sourceInterfaces, setSourceInterfaces] = useState([]);
  const [targetInterfaces, setTargetInterfaces] = useState([]);
  const [selectedSourceInterface, setSelectedSourceInterface] = useState(null);
  const [selectedTargetInterface, setSelectedTargetInterface] = useState(null);
  const [createBidirectional, setCreateBidirectional] = useState(true);
  const [suggestedRoutes, setSuggestedRoutes] = useState([]);

  useEffect(() => {
    if (isOpen && sourceNode && targetNode) {
      // Cargar interfaces de ambos nodos
      const sourceIfaces = networkData.filter(net => net.Equipo === sourceNode);
      const targetIfaces = networkData.filter(net => net.Equipo === targetNode);

      setSourceInterfaces(sourceIfaces);
      setTargetInterfaces(targetIfaces);

      // Auto-seleccionar interfaces si solo hay una en cada lado
      if (sourceIfaces.length === 1) setSelectedSourceInterface(0);
      if (targetIfaces.length === 1) setSelectedTargetInterface(0);

      // Buscar si ya existe VLAN compartida para auto-seleccionar
      const sharedVlan = sourceIfaces.find(si =>
        targetIfaces.some(ti => ti.VLAN === si.VLAN)
      );

      if (sharedVlan) {
        const sourceIdx = sourceIfaces.findIndex(si => si.VLAN === sharedVlan.VLAN);
        const targetIdx = targetIfaces.findIndex(ti => ti.VLAN === sharedVlan.VLAN);
        if (sourceIdx !== -1) setSelectedSourceInterface(sourceIdx);
        if (targetIdx !== -1) setSelectedTargetInterface(targetIdx);
      }
    }
  }, [isOpen, sourceNode, targetNode, networkData]);

  useEffect(() => {
    if (selectedSourceInterface !== null && selectedTargetInterface !== null) {
      generateSuggestedRoutes();
    }
  }, [selectedSourceInterface, selectedTargetInterface, createBidirectional]);

  const generateSuggestedRoutes = () => {
    const sourceIface = sourceInterfaces[selectedSourceInterface];
    const targetIface = targetInterfaces[selectedTargetInterface];

    if (!sourceIface || !targetIface) return;

    const routes = [];

    // Ruta desde source hacia la red del target
    routes.push({
      from: sourceNode,
      to: targetNode,
      route: {
        Equipo: sourceNode,
        IP_Destino: targetIface.Red,
        Mascara: targetIface.Mascara,
        Gateway: targetIface.IP,
      },
      description: `${sourceNode} puede alcanzar la red ${targetIface.Red}${targetIface.Mascara} vía ${targetIface.IP}`
    });

    if (createBidirectional) {
      // Ruta desde target hacia la red del source
      routes.push({
        from: targetNode,
        to: sourceNode,
        route: {
          Equipo: targetNode,
          IP_Destino: sourceIface.Red,
          Mascara: sourceIface.Mascara,
          Gateway: sourceIface.IP,
        },
        description: `${targetNode} puede alcanzar la red ${sourceIface.Red}${sourceIface.Mascara} vía ${sourceIface.IP}`
      });
    }

    // Buscar otras redes de cada equipo para crear rutas adicionales
    const otherSourceNets = sourceInterfaces.filter((_, idx) => idx !== selectedSourceInterface);
    const otherTargetNets = targetInterfaces.filter((_, idx) => idx !== selectedTargetInterface);

    // Rutas desde target hacia otras redes de source
    if (createBidirectional) {
      otherSourceNets.forEach(net => {
        routes.push({
          from: targetNode,
          to: sourceNode,
          route: {
            Equipo: targetNode,
            IP_Destino: net.Red,
            Mascara: net.Mascara,
            Gateway: sourceIface.IP,
          },
          description: `${targetNode} puede alcanzar la red ${net.Red}${net.Mascara} vía ${sourceIface.IP}`,
          optional: true
        });
      });
    }

    // Rutas desde source hacia otras redes de target
    otherTargetNets.forEach(net => {
      routes.push({
        from: sourceNode,
        to: targetNode,
        route: {
          Equipo: sourceNode,
          IP_Destino: net.Red,
          Mascara: net.Mascara,
          Gateway: targetIface.IP,
        },
        description: `${sourceNode} puede alcanzar la red ${net.Red}${net.Mascara} vía ${targetIface.IP}`,
        optional: true
      });
    });

    setSuggestedRoutes(routes);
  };

  const handleSave = () => {
    if (selectedSourceInterface === null || selectedTargetInterface === null) {
      alert('Selecciona las interfaces que conectan ambos equipos');
      return;
    }

    // Filtrar rutas que no existen ya
    const newRoutes = suggestedRoutes
      .filter(sr => !sr.optional || confirm(`¿Agregar ruta opcional?\n${sr.description}`))
      .map(sr => sr.route)
      .filter(route => {
        // Verificar si la ruta ya existe
        return !routingData.some(r =>
          r.Equipo === route.Equipo &&
          r.IP_Destino === route.IP_Destino &&
          r.Mascara === route.Mascara &&
          r.Gateway === route.Gateway
        );
      });

    if (newRoutes.length === 0) {
      alert('Todas las rutas sugeridas ya existen en la configuración');
      onClose();
      return;
    }

    onSaveRoutes(newRoutes);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Configurar Enrutamiento
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Conectando: <strong>{sourceNode}</strong> ↔ <strong>{targetNode}</strong>
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Información de la conexión */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Configuración de Enrutamiento</p>
                <p>Selecciona las interfaces que se conectan físicamente entre ambos equipos. Se crearán las rutas estáticas necesarias para que puedan comunicarse.</p>
              </div>
            </div>
          </div>

          {/* Selección de interfaz source */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Interfaz de {sourceNode}
            </label>
            {sourceInterfaces.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
                ⚠️ {sourceNode} no tiene interfaces configuradas. Edita el nodo primero.
              </div>
            ) : (
              <div className="space-y-2">
                {sourceInterfaces.map((iface, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center gap-3 p-3 border-2 rounded-md cursor-pointer transition-colors ${
                      selectedSourceInterface === idx
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sourceInterface"
                      checked={selectedSourceInterface === idx}
                      onChange={() => setSelectedSourceInterface(idx)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {iface.IP} - {iface.Red}{iface.Mascara}
                      </p>
                      <p className="text-xs text-gray-500">VLAN {iface.VLAN}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Selección de interfaz target */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Interfaz de {targetNode}
            </label>
            {targetInterfaces.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
                ⚠️ {targetNode} no tiene interfaces configuradas. Edita el nodo primero.
              </div>
            ) : (
              <div className="space-y-2">
                {targetInterfaces.map((iface, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center gap-3 p-3 border-2 rounded-md cursor-pointer transition-colors ${
                      selectedTargetInterface === idx
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetInterface"
                      checked={selectedTargetInterface === idx}
                      onChange={() => setSelectedTargetInterface(idx)}
                      className="w-4 h-4 text-green-600"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {iface.IP} - {iface.Red}{iface.Mascara}
                      </p>
                      <p className="text-xs text-gray-500">VLAN {iface.VLAN}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Opción bidireccional */}
          <div>
            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-md cursor-pointer">
              <input
                type="checkbox"
                checked={createBidirectional}
                onChange={(e) => setCreateBidirectional(e.target.checked)}
                className="w-5 h-5 text-blue-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Crear rutas bidireccionales
                </p>
                <p className="text-xs text-gray-600">
                  Crea rutas en ambos sentidos para comunicación completa
                </p>
              </div>
            </label>
          </div>

          {/* Vista previa de rutas */}
          {suggestedRoutes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Rutas que se crearán ({suggestedRoutes.filter(r => !r.optional).length} requeridas, {suggestedRoutes.filter(r => r.optional).length} opcionales)
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {suggestedRoutes.map((suggestedRoute, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-md border ${
                      suggestedRoute.optional
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <p className="text-xs font-mono text-gray-800">
                          {suggestedRoute.route.Equipo}: {suggestedRoute.route.IP_Destino}{suggestedRoute.route.Mascara} via {suggestedRoute.route.Gateway}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {suggestedRoute.description}
                        </p>
                      </div>
                      {suggestedRoute.optional && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                          Opcional
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={selectedSourceInterface === null || selectedTargetInterface === null}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Crear Rutas
          </button>
        </div>
      </div>
    </div>
  );
};

export default EdgeConfigModal;
