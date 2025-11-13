import { useState, useEffect } from 'react';
import FileUploader from './components/FileUploader';
import TraceRouteForm from './components/TraceRouteForm';
import NetworkDiagram from './components/NetworkDiagram';
import HopsTable from './components/HopsTable';
import ResultsSummary from './components/ResultsSummary';
import { executeTraceroute } from './utils/traceroute';
import NetworkUploader from './components/NetworkUploader';
import DataManager from './components/DataManager';
import IPSearcher from './components/IPSearcher';


/**
 * App Component - Componente principal
 * Gestiona el estado global de la aplicación:
 * - Tabla de ruteo cargada desde CSV
 * - Resultado del traceroute
 * - Errores y validaciones
 * - Persistencia con localStorage
 */
function App() {
  // Cargar datos desde localStorage al iniciar
  const loadFromLocalStorage = (key, defaultValue = []) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return defaultValue;
    }
  };

  const [routingData, setRoutingData] = useState(() => loadFromLocalStorage('routingData', []));
  const [traceResult, setTraceResult] = useState(null);
  const [error, setError] = useState(null);
  const [networkData, setNetworkData] = useState(() => loadFromLocalStorage('networkData', []));
  const [isDataManagerOpen, setIsDataManagerOpen] = useState(false);
  const [isIPSearcherOpen, setIsIPSearcherOpen] = useState(false);

  // Guardar en localStorage cuando cambien los datos
  useEffect(() => {
    localStorage.setItem('networkData', JSON.stringify(networkData));
  }, [networkData]);

  useEffect(() => {
    localStorage.setItem('routingData', JSON.stringify(routingData));
  }, [routingData]);

  // Limpiar localStorage
  const clearLocalStorage = () => {
    localStorage.removeItem('networkData');
    localStorage.removeItem('routingData');
    localStorage.removeItem('manualEdges');
    setNetworkData([]);
    setRoutingData([]);
    setTraceResult(null);
    setError(null);
  };

  // Exportar datos como JSON
  const exportData = () => {
    const manualEdges = localStorage.getItem('manualEdges');
    const data = {
      networkData,
      routingData,
      manualEdges: manualEdges ? JSON.parse(manualEdges) : [],
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traceroute-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Importar datos desde JSON
  const handleImport = (imported) => {
    if (imported.networkData) {
      setNetworkData(imported.networkData);
    }
    if (imported.routingData) {
      setRoutingData(imported.routingData);
    }
    if (imported.manualEdges) {
      localStorage.setItem('manualEdges', JSON.stringify(imported.manualEdges));
    }
    setTraceResult(null);
    setError(null);
  };

  // Maneja la carga de datos desde el CSV
  const handleDataLoaded = (data) => {
    // Clonar el array para asegurar que React detecte el cambio
    const clonedData = [...data];

    setTimeout(() => {
      setRoutingData(clonedData);
      setTraceResult(null);
      setError(null);
    }, 0);
  };

  // Maneja errores del FileUploader
  const handleFileError = (errorMessage) => {
    setError(errorMessage);
    setRoutingData([]);
    setTraceResult(null);
  };

  // Maneja la carga de redes desde CSV
const handleNetworksLoaded = (data) => {
  const clonedData = [...data];
  setTimeout(() => {
    setNetworkData(clonedData);
    setTraceResult(null);
    setError(null);
  }, 0);
};

// Maneja errores del NetworkUploader
const handleNetworkError = (errorMessage) => {
  setError(errorMessage);
  setNetworkData([]);
  setTraceResult(null);
};


  // Ejecuta el traceroute cuando el usuario presiona el botón
  const handleExecuteTraceroute = ({ sourceEquipment, sourceIP, destIP }) => {
    try {
      const result = executeTraceroute(
        sourceEquipment,
        sourceIP,
        destIP,
        routingData,
        networkData 
      );
      setTraceResult(result);
      setError(result.success ? null : result.error);
    } catch (err) {
      setError(`Error inesperado: ${err.message}`);
      setTraceResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Simulador de Traceroute
          </h1>
          <p className="text-gray-600">
            Visualiza el recorrido de paquetes a través de tablas de ruteo estáticas
          </p>
        </div>

        {/* Mensaje de error global */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Layout principal - Grid de 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda - Controles */}
          <div className="lg:col-span-1 space-y-6">
            {/* File Uploader */}
            <FileUploader
              onDataLoaded={handleDataLoaded}
              onError={handleFileError}
            />

            {/* Network Uploader */}
            <NetworkUploader
              onNetworksLoaded={handleNetworksLoaded}
              onError={handleNetworkError}
            />

            {/* Formulario de Traceroute */}
            <TraceRouteForm
              onExecute={handleExecuteTraceroute}
              disabled={networkData.length === 0}
              equipos={networkData}
            />

            {/* Resumen de resultados */}
            {traceResult && <ResultsSummary result={traceResult} />}
          </div>

          {/* Columna derecha - Visualización */}
          <div className="lg:col-span-2 space-y-6">
            {/* Diagrama de red */}
            <NetworkDiagram
              networkData={networkData}
              traceResult={traceResult}
              onNetworkUpdate={setNetworkData}
              routingData={routingData}
              onRoutingUpdate={setRoutingData}
            />

            {/* Tabla de saltos */}
            {traceResult?.success && <HopsTable hops={traceResult.hops} />}
          </div>
        </div>

        {/* Footer con instrucciones */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            📘 Guía de Uso del Simulador
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            {/* Inicio Rápido */}
            <div>
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                Inicio Rápido
              </h4>
              <ol className="list-disc list-inside space-y-1 text-sm text-blue-800 ml-2">
                <li>Carga <strong>redes.csv</strong> (topología de red)</li>
                <li>Carga <strong>rutas.csv</strong> (tablas de ruteo)</li>
                <li>El diagrama se generará automáticamente</li>
                <li>Usa las <strong>pruebas sugeridas</strong> o configura manualmente</li>
                <li>Click en <strong>"Ejecutar Traceroute"</strong></li>
              </ol>
            </div>

            {/* Edición de Topología */}
            <div>
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                Edición de Topología
              </h4>
              <ol className="list-disc list-inside space-y-1 text-sm text-blue-800 ml-2">
                <li>Click en <strong>"Modo Edición"</strong> en el diagrama</li>
                <li><strong>Agregar Nodo:</strong> Configura interfaces y rutas</li>
                <li><strong>Editar Nodo:</strong> Selecciona y modifica propiedades</li>
                <li><strong>Conectar Nodos:</strong> Arrastra entre equipos</li>
                <li><strong>Enrutamiento automático:</strong> Se sugieren rutas al conectar</li>
              </ol>
            </div>

            {/* Herramientas Avanzadas */}
            <div>
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">🔍</span>
                Búsqueda de IP
              </h4>
              <p className="text-sm text-blue-800 ml-2">
                Click en el botón <strong>morado flotante</strong> (esquina inferior derecha) para buscar
                qué equipos tienen rutas hacia una IP específica.
              </p>
            </div>

            {/* Gestión de Datos */}
            <div>
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">💾</span>
                Gestión de Datos
              </h4>
              <p className="text-sm text-blue-800 ml-2">
                Click en el botón <strong>índigo flotante</strong> para:
                <br/>• Importar/Exportar configuraciones (JSON)
                <br/>• Ver estadísticas de almacenamiento
                <br/>• Limpiar datos guardados
              </p>
            </div>
          </div>

          {/* Tips adicionales */}
          <div className="mt-4 pt-4 border-t border-blue-300">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Tips Útiles</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-700">
              <div>• Los datos se guardan automáticamente en tu navegador</div>
              <div>• Las pruebas sugeridas se actualizan con la topología</div>
              <div>• Arrastra los nodos para reorganizar el diagrama</div>
              <div>• Las conexiones manuales persisten al recargar</div>
              <div>• Exporta regularmente para crear respaldos</div>
              <div>• Las rutas en azul muestran el path del traceroute</div>
            </div>
          </div>

          {/* Archivos de ejemplo */}
          <div className="mt-4 pt-4 border-t border-blue-300">
            <p className="text-sm text-blue-800">
              📂 <strong>Archivos de ejemplo:</strong>{' '}
              <code className="bg-blue-100 px-2 py-1 rounded text-xs">public/redes.csv</code>
              {' • '}
              <code className="bg-blue-100 px-2 py-1 rounded text-xs">public/rutas.csv</code>
            </p>
          </div>
        </div>

        {/* Botones flotantes */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
          <button
            onClick={() => setIsIPSearcherOpen(true)}
            className="bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-all hover:scale-110 flex items-center justify-center group"
            title="Buscar IP"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <button
            onClick={() => setIsDataManagerOpen(true)}
            className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 flex items-center justify-center group"
            title="Gestión de Datos"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </button>
        </div>

        {/* Modales */}
        <DataManager
          isOpen={isDataManagerOpen}
          onClose={() => setIsDataManagerOpen(false)}
          onClear={clearLocalStorage}
          onExport={exportData}
          onImport={handleImport}
          networkData={networkData}
          routingData={routingData}
        />

        <IPSearcher
          isOpen={isIPSearcherOpen}
          onClose={() => setIsIPSearcherOpen(false)}
          routingData={routingData}
          networkData={networkData}
        />
      </div>
    </div>
  );
}

export default App;
