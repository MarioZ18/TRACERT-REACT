import { useState, useEffect } from 'react';

/**
 * NodeEditor Component
 * Modal para editar/crear nodos con todas sus propiedades:
 * - Interfaces (IPs, redes, máscaras, VLANs)
 * - Rutas estáticas
 */
const NodeEditor = ({ isOpen, onClose, equipmentName, networkData, routingData, onSave }) => {
  const [equipmentInterfaces, setEquipmentInterfaces] = useState([]);
  const [equipmentRoutes, setEquipmentRoutes] = useState([]);
  const [nodeName, setNodeName] = useState('');

  useEffect(() => {
    if (isOpen && equipmentName) {
      setNodeName(equipmentName);
      // Cargar interfaces del equipo
      const interfaces = networkData.filter(net => net.Equipo === equipmentName);
      setEquipmentInterfaces(interfaces.length > 0 ? interfaces : [createEmptyInterface(equipmentName)]);

      // Cargar rutas del equipo
      const routes = routingData.filter(route => route.Equipo === equipmentName);
      setEquipmentRoutes(routes.length > 0 ? routes : [createEmptyRoute(equipmentName)]);
    } else if (isOpen) {
      // Nuevo nodo
      setNodeName('');
      setEquipmentInterfaces([createEmptyInterface('')]);
      setEquipmentRoutes([createEmptyRoute('')]);
    }
  }, [isOpen, equipmentName, networkData, routingData]);

  const createEmptyInterface = (equipo) => ({
    Equipo: equipo,
    IP: '',
    Red: '',
    Mascara: '/24',
    VLAN: ''
  });

  const createEmptyRoute = (equipo) => ({
    Equipo: equipo,
    IP_Destino: '',
    Mascara: '/24',
    Gateway: ''
  });

  const handleAddInterface = () => {
    setEquipmentInterfaces([...equipmentInterfaces, createEmptyInterface(nodeName)]);
  };

  const handleRemoveInterface = (index) => {
    setEquipmentInterfaces(equipmentInterfaces.filter((_, i) => i !== index));
  };

  const handleInterfaceChange = (index, field, value) => {
    const updated = [...equipmentInterfaces];
    updated[index][field] = value;
    if (field === 'Equipo') {
      setNodeName(value);
      // Actualizar nombre en todas las interfaces y rutas
      setEquipmentInterfaces(equipmentInterfaces.map(iface => ({ ...iface, Equipo: value })));
      setEquipmentRoutes(equipmentRoutes.map(route => ({ ...route, Equipo: value })));
    }
    setEquipmentInterfaces(updated);
  };

  const handleAddRoute = () => {
    setEquipmentRoutes([...equipmentRoutes, createEmptyRoute(nodeName)]);
  };

  const handleRemoveRoute = (index) => {
    setEquipmentRoutes(equipmentRoutes.filter((_, i) => i !== index));
  };

  const handleRouteChange = (index, field, value) => {
    const updated = [...equipmentRoutes];
    updated[index][field] = value;
    setEquipmentRoutes(updated);
  };

  const handleSave = () => {
    // Validar que el nombre del equipo esté presente
    if (!nodeName.trim()) {
      alert('El nombre del equipo es requerido');
      return;
    }

    // Validar que haya al menos una interfaz
    const validInterfaces = equipmentInterfaces.filter(iface =>
      iface.IP.trim() && iface.Red.trim() && iface.Mascara.trim() && iface.VLAN.trim()
    );

    if (validInterfaces.length === 0) {
      alert('Agrega al menos una interfaz válida con IP, Red, Máscara y VLAN');
      return;
    }

    // Filtrar rutas válidas
    const validRoutes = equipmentRoutes.filter(route =>
      route.IP_Destino.trim() && route.Mascara.trim() && route.Gateway.trim()
    );

    // Actualizar nombre en todas las interfaces y rutas
    const updatedInterfaces = validInterfaces.map(iface => ({ ...iface, Equipo: nodeName }));
    const updatedRoutes = validRoutes.map(route => ({ ...route, Equipo: nodeName }));

    onSave({
      oldName: equipmentName,
      newName: nodeName,
      interfaces: updatedInterfaces,
      routes: updatedRoutes
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {equipmentName ? `Editar Equipo: ${equipmentName}` : 'Nuevo Equipo'}
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
        </div>

        <div className="p-6 space-y-6">
          {/* Nombre del equipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Equipo
            </label>
            <input
              type="text"
              value={nodeName}
              onChange={(e) => {
                setNodeName(e.target.value);
                setEquipmentInterfaces(equipmentInterfaces.map(iface => ({ ...iface, Equipo: e.target.value })));
                setEquipmentRoutes(equipmentRoutes.map(route => ({ ...route, Equipo: e.target.value })));
              }}
              placeholder="R1, SW1, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Interfaces */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">Interfaces de Red</h3>
              <button
                onClick={handleAddInterface}
                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Agregar Interfaz
              </button>
            </div>

            <div className="space-y-3">
              {equipmentInterfaces.map((iface, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4 bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">IP</label>
                        <input
                          type="text"
                          value={iface.IP}
                          onChange={(e) => handleInterfaceChange(index, 'IP', e.target.value)}
                          placeholder="192.168.1.1"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Red</label>
                        <input
                          type="text"
                          value={iface.Red}
                          onChange={(e) => handleInterfaceChange(index, 'Red', e.target.value)}
                          placeholder="192.168.1.0"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Máscara</label>
                        <select
                          value={iface.Mascara}
                          onChange={(e) => handleInterfaceChange(index, 'Mascara', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="/8">/8</option>
                          <option value="/16">/16</option>
                          <option value="/24">/24</option>
                          <option value="/25">/25</option>
                          <option value="/26">/26</option>
                          <option value="/27">/27</option>
                          <option value="/28">/28</option>
                          <option value="/29">/29</option>
                          <option value="/30">/30</option>
                          <option value="/32">/32</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">VLAN</label>
                        <input
                          type="text"
                          value={iface.VLAN}
                          onChange={(e) => handleInterfaceChange(index, 'VLAN', e.target.value)}
                          placeholder="10"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveInterface(index)}
                      className="mt-5 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar interfaz"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rutas estáticas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">Rutas Estáticas</h3>
              <button
                onClick={handleAddRoute}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Agregar Ruta
              </button>
            </div>

            <div className="space-y-3">
              {equipmentRoutes.map((route, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4 bg-blue-50">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Red Destino</label>
                        <input
                          type="text"
                          value={route.IP_Destino}
                          onChange={(e) => handleRouteChange(index, 'IP_Destino', e.target.value)}
                          placeholder="192.168.2.0"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Máscara</label>
                        <select
                          value={route.Mascara}
                          onChange={(e) => handleRouteChange(index, 'Mascara', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="/8">/8</option>
                          <option value="/16">/16</option>
                          <option value="/24">/24</option>
                          <option value="/25">/25</option>
                          <option value="/26">/26</option>
                          <option value="/27">/27</option>
                          <option value="/28">/28</option>
                          <option value="/29">/29</option>
                          <option value="/30">/30</option>
                          <option value="/32">/32</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Gateway</label>
                        <input
                          type="text"
                          value={route.Gateway}
                          onChange={(e) => handleRouteChange(index, 'Gateway', e.target.value)}
                          placeholder="192.168.1.1 o 'directo'"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveRoute(index)}
                      className="mt-5 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar ruta"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeEditor;
