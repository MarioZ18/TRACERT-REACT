import { useState } from 'react';

/**
 * TraceRouteForm Component
 * Formulario para ingresar IP origen, IP destino y equipo origen
 * Ejecuta el traceroute al presionar el botón
 */
const TraceRouteForm = ({ onExecute, disabled, equipos }) => {
  const [sourceEquipment, setSourceEquipment] = useState('');
  const [sourceIP, setSourceIP] = useState('');
  const [destIP, setDestIP] = useState('');
  const [errors, setErrors] = useState({});

  // Validación básica de formato IP
  const validateIP = (ip) => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;

    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  };

  // Maneja el submit del formulario
  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!sourceEquipment) {
      newErrors.sourceEquipment = 'Selecciona un equipo origen';
    }

    if (!sourceIP) {
      newErrors.sourceIP = 'Ingresa la IP origen';
    } else if (!validateIP(sourceIP)) {
      newErrors.sourceIP = 'Formato de IP inválido';
    }

    if (!destIP) {
      newErrors.destIP = 'Ingresa la IP destino';
    } else if (!validateIP(destIP)) {
      newErrors.destIP = 'Formato de IP inválido';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onExecute({ sourceEquipment, sourceIP, destIP });
  };

  // Extrae lista única de equipos
  const uniqueEquipos = equipos ? [...new Set(equipos.map(e => e.Equipo))] : [];

  // Generar sugerencias de pruebas dinámicas basadas en la topología actual
  const generateTestSuggestions = () => {
    if (!equipos || equipos.length === 0) return [];

    const suggestions = [];
    const equipmentList = uniqueEquipos;

    // Si hay al menos 2 equipos
    if (equipmentList.length >= 2) {
      const firstEquip = equipmentList[0];
      const lastEquip = equipmentList[equipmentList.length - 1];

      // Obtener primera IP del primer equipo
      const firstEquipInterface = equipos.find(e => e.Equipo === firstEquip);
      const lastEquipInterface = equipos.find(e => e.Equipo === lastEquip);

      if (firstEquipInterface && lastEquipInterface) {
        suggestions.push({
          name: `Ruta completa (${firstEquip} → ${lastEquip})`,
          description: `Prueba la ruta más larga disponible`,
          sourceEquipment: firstEquip,
          sourceIP: firstEquipInterface.IP,
          destIP: lastEquipInterface.IP
        });
      }
    }

    // Si hay al menos 3 equipos, crear ruta intermedia
    if (equipmentList.length >= 3) {
      const firstEquip = equipmentList[0];
      const middleEquip = equipmentList[Math.floor(equipmentList.length / 2)];

      const firstEquipInterface = equipos.find(e => e.Equipo === firstEquip);
      const middleEquipInterface = equipos.find(e => e.Equipo === middleEquip);

      if (firstEquipInterface && middleEquipInterface) {
        suggestions.push({
          name: `Ruta media (${firstEquip} → ${middleEquip})`,
          description: `Prueba hasta un equipo intermedio`,
          sourceEquipment: firstEquip,
          sourceIP: firstEquipInterface.IP,
          destIP: middleEquipInterface.IP
        });
      }
    }

    // Si hay al menos 2 equipos, prueba desde el centro
    if (equipmentList.length >= 2) {
      const middleIdx = Math.floor(equipmentList.length / 2);
      const middleEquip = equipmentList[middleIdx];
      const targetEquip = equipmentList[equipmentList.length - 1];

      const middleEquipInterface = equipos.find(e => e.Equipo === middleEquip);
      const targetEquipInterface = equipos.find(e => e.Equipo === targetEquip);

      if (middleEquipInterface && targetEquipInterface && middleEquip !== targetEquip) {
        suggestions.push({
          name: `Desde el centro (${middleEquip} → ${targetEquip})`,
          description: `Inicia desde equipo intermedio`,
          sourceEquipment: middleEquip,
          sourceIP: middleEquipInterface.IP,
          destIP: targetEquipInterface.IP
        });
      }
    }

    // Prueba de red directa
    if (equipmentList.length >= 1) {
      const firstEquip = equipmentList[0];
      const firstEquipInterface = equipos.find(e => e.Equipo === firstEquip);

      if (firstEquipInterface) {
        // Calcular una IP en la misma red
        const ipParts = firstEquipInterface.IP.split('.');
        const destIP = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.254`;

        suggestions.push({
          name: 'Red directa',
          description: `Destino en la misma red del origen (${firstEquipInterface.Red}${firstEquipInterface.Mascara})`,
          sourceEquipment: firstEquip,
          sourceIP: firstEquipInterface.IP,
          destIP: destIP
        });
      }
    }

    // Agregar pruebas entre equipos con múltiples interfaces
    const equiposWithMultipleInterfaces = uniqueEquipos.filter(eq =>
      equipos.filter(e => e.Equipo === eq).length > 1
    );

    if (equiposWithMultipleInterfaces.length >= 2) {
      const sourceEquip = equiposWithMultipleInterfaces[0];
      const targetEquip = equiposWithMultipleInterfaces[1];

      const sourceInterfaces = equipos.filter(e => e.Equipo === sourceEquip);
      const targetInterfaces = equipos.filter(e => e.Equipo === targetEquip);

      if (sourceInterfaces[0] && targetInterfaces[0]) {
        suggestions.push({
          name: `Múltiples interfaces (${sourceEquip} → ${targetEquip})`,
          description: `Equipos con varias redes configuradas`,
          sourceEquipment: sourceEquip,
          sourceIP: sourceInterfaces[0].IP,
          destIP: targetInterfaces[targetInterfaces.length - 1].IP
        });
      }
    }

    return suggestions;
  };

  const testSuggestions = generateTestSuggestions();

  // Cargar sugerencia de prueba
  const loadTestSuggestion = (suggestion) => {
    setSourceEquipment(suggestion.sourceEquipment);
    setSourceIP(suggestion.sourceIP);
    setDestIP(suggestion.destIP);
    setErrors({});
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Configuración de Traceroute
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selección de equipo origen */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Equipo Origen
          </label>
          <select
            value={sourceEquipment}
            onChange={(e) => setSourceEquipment(e.target.value)}
            disabled={disabled || uniqueEquipos.length === 0}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Selecciona un equipo...</option>
            {uniqueEquipos.map((equipo) => (
              <option key={equipo} value={equipo}>
                {equipo}
              </option>
            ))}
          </select>
          {errors.sourceEquipment && (
            <p className="text-red-500 text-xs mt-1">{errors.sourceEquipment}</p>
          )}
        </div>

        {/* IP Origen */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            IP Origen
          </label>
          <input
            type="text"
            value={sourceIP}
            onChange={(e) => setSourceIP(e.target.value)}
            placeholder="192.168.1.1"
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {errors.sourceIP && (
            <p className="text-red-500 text-xs mt-1">{errors.sourceIP}</p>
          )}
        </div>

        {/* IP Destino */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            IP Destino
          </label>
          <input
            type="text"
            value={destIP}
            onChange={(e) => setDestIP(e.target.value)}
            placeholder="192.168.2.1"
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {errors.destIP && (
            <p className="text-red-500 text-xs mt-1">{errors.destIP}</p>
          )}
        </div>

        {/* Botón de ejecutar */}
        <button
          type="submit"
          disabled={disabled || uniqueEquipos.length === 0}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {disabled ? 'Carga un archivo CSV primero' : 'Ejecutar Traceroute'}
        </button>
      </form>

      {/* Sugerencias de pruebas */}
      {!disabled && uniqueEquipos.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Pruebas Sugeridas
          </h3>
          <div className="space-y-2">
            {testSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => loadTestSuggestion(suggestion)}
                className="w-full text-left p-3 border border-gray-200 rounded-md hover:border-blue-400 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700">
                      {suggestion.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {suggestion.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      {suggestion.sourceIP} → {suggestion.destIP}
                    </p>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0 mt-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TraceRouteForm;
