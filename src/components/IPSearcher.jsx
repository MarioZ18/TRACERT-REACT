import { useState } from 'react';

/**
 * IPSearcher Component
 * Modal flotante para buscar una IP en todas las tablas de enrutamiento
 * Muestra qué equipos tienen rutas hacia esa IP
 */
const IPSearcher = ({ isOpen, onClose, routingData, networkData }) => {
  const [searchIP, setSearchIP] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  if (!isOpen) return null;

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

  // Convertir IP a número
  const ipToNumber = (ip) => {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
  };

  // Verificar si IP está en red
  const isIPInNetwork = (ip, network, mask) => {
    try {
      const maskBits = parseInt(mask.replace('/', ''));
      const ipNum = ipToNumber(ip);
      const networkNum = ipToNumber(network);
      const maskNum = (-1 << (32 - maskBits)) >>> 0;
      return (ipNum & maskNum) === (networkNum & maskNum);
    } catch {
      return false;
    }
  };

  // Buscar IP en tablas de ruteo
  const handleSearch = () => {
    if (!validateIP(searchIP)) {
      setSearchResults({ error: 'Formato de IP inválido' });
      return;
    }

    if (!routingData || routingData.length === 0) {
      setSearchResults({ error: 'No hay tabla de ruteo cargada' });
      return;
    }

    const results = [];

    // Buscar en todas las rutas de cada equipo
    const equipos = [...new Set(routingData.map(r => r.Equipo))];

    equipos.forEach(equipo => {
      const equipmentRoutes = routingData.filter(r => r.Equipo === equipo);
      const matchingRoutes = equipmentRoutes.filter(route =>
        isIPInNetwork(searchIP, route.IP_Destino, route.Mascara)
      );

      if (matchingRoutes.length > 0) {
        // Encontrar la ruta más específica (mayor máscara)
        const bestRoute = matchingRoutes.reduce((best, current) => {
          const bestMask = parseInt(best.Mascara.replace('/', ''));
          const currentMask = parseInt(current.Mascara.replace('/', ''));
          return currentMask > bestMask ? current : best;
        });

        results.push({
          equipo,
          route: bestRoute,
          allMatches: matchingRoutes.length
        });
      }
    });

    // Verificar si la IP pertenece directamente a alguna red
    const directNetworks = [];
    if (networkData && networkData.length > 0) {
      networkData.forEach(net => {
        if (isIPInNetwork(searchIP, net.Red, net.Mascara)) {
          directNetworks.push(net);
        }
      });
    }

    setSearchResults({
      ip: searchIP,
      routes: results,
      directNetworks,
      totalEquipments: results.length
    });
  };

  const handleClear = () => {
    setSearchIP('');
    setSearchResults(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Búsqueda de Rutas por IP
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

        <div className="p-6">

      {/* Campo de búsqueda */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchIP}
            onChange={(e) => setSearchIP(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="192.168.1.1"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={!searchIP}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Buscar
          </button>
          {searchResults && (
            <button
              onClick={handleClear}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Resultados */}
        {searchResults && (
          <div className="mt-4">
            {searchResults.error ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                {searchResults.error}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Información general */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm font-semibold text-blue-900">
                    IP buscada: {searchResults.ip}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {searchResults.totalEquipments} equipo(s) con rutas hacia esta IP
                  </p>
                </div>

                {/* Redes directas */}
                {searchResults.directNetworks.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm font-semibold text-green-900 mb-2">
                      Redes Directas
                    </p>
                    <div className="space-y-1">
                      {searchResults.directNetworks.map((net, idx) => (
                        <div key={idx} className="text-xs text-green-800 font-mono bg-green-100 p-2 rounded">
                          {net.Equipo}: {net.Red}{net.Mascara} (VLAN {net.VLAN})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rutas encontradas */}
                {searchResults.routes.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700">
                      Rutas disponibles:
                    </p>
                    {searchResults.routes.map((result, idx) => (
                      <div
                        key={idx}
                        className="border border-gray-200 rounded-md p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {result.equipo}
                            </p>
                            <div className="mt-2 space-y-1 text-xs">
                              <p className="text-gray-700">
                                <span className="font-semibold">Red destino:</span>{' '}
                                {result.route.IP_Destino}{result.route.Mascara}
                              </p>
                              <p className="text-gray-700">
                                <span className="font-semibold">Gateway:</span>{' '}
                                <span className="font-mono bg-gray-200 px-2 py-0.5 rounded">
                                  {result.route.Gateway}
                                </span>
                              </p>
                              {result.allMatches > 1 && (
                                <p className="text-gray-500 italic">
                                  ({result.allMatches} rutas coinciden, mostrando la más específica)
                                </p>
                              )}
                            </div>
                          </div>
                          <svg
                            className="w-5 h-5 text-green-600 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-700">
                    No se encontraron rutas hacia esta IP en ninguna tabla de ruteo
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );
};

export default IPSearcher;
