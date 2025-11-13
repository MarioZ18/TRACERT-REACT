import { useRef } from 'react';

/**
 * DataManager Component
 * Modal flotante para gestionar los datos almacenados en localStorage
 * Permite limpiar, exportar e importar datos
 */
const DataManager = ({ isOpen, onClose, onClear, onExport, onImport, networkData, routingData }) => {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;
  const getStorageSize = () => {
    try {
      const networkSize = JSON.stringify(networkData).length;
      const routingSize = JSON.stringify(routingData).length;
      const manualEdges = localStorage.getItem('manualEdges') || '[]';
      const edgesSize = manualEdges.length;
      const totalBytes = networkSize + routingSize + edgesSize;
      const totalKB = (totalBytes / 1024).toFixed(2);
      return totalKB;
    } catch {
      return '0';
    }
  };

  const getManualEdgesCount = () => {
    try {
      const manualEdges = localStorage.getItem('manualEdges');
      return manualEdges ? JSON.parse(manualEdges).length : 0;
    } catch {
      return 0;
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);

        // Validar que tenga la estructura esperada
        if (!imported.networkData || !imported.routingData) {
          alert('El archivo JSON no tiene el formato correcto');
          return;
        }

        if (confirm('¿Importar estos datos? Esto sobrescribirá los datos actuales.')) {
          onImport(imported);
          onClose();
        }
      } catch (error) {
        alert(`Error al importar: ${error.message}`);
      }
    };
    reader.readAsText(file);

    // Resetear el input para permitir importar el mismo archivo nuevamente
    event.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Gestión de Datos
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

      <div className="space-y-4">
        {/* Información de almacenamiento */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Datos almacenados
          </h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Redes: {networkData.length} entradas</p>
            <p>Rutas: {routingData.length} entradas</p>
            <p>Conexiones manuales: {getManualEdgesCount()} conexiones</p>
            <p>Tamaño total: ~{getStorageSize()} KB</p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
          />

          <button
            onClick={handleImportClick}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L9 8m4-4v12" />
            </svg>
            Importar datos (JSON)
          </button>

          <button
            onClick={onExport}
            disabled={networkData.length === 0 && routingData.length === 0}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar datos (JSON)
          </button>

          <button
            onClick={onClear}
            disabled={networkData.length === 0 && routingData.length === 0}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Limpiar todos los datos
          </button>
        </div>

        {/* Información */}
        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-md">
          <p className="font-semibold text-blue-800 mb-1">Información:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>Los datos se guardan automáticamente en tu navegador</li>
            <li>Importa archivos JSON previamente exportados</li>
            <li>Exporta tus datos para crear respaldos</li>
            <li>Limpiar datos elimina toda la información almacenada</li>
          </ul>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
};

export default DataManager;
