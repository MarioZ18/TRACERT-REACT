import { useState } from 'react';
import Papa from 'papaparse';

/**
 * NetworkUploader Component
 * Permite al usuario cargar un archivo CSV con la definición de redes.
 * Nuevo formato de columnas esperadas:
 *   Equipo, IP, Red, Mascara, VLAN
 */
const NetworkUploader = ({ onNetworksLoaded, onError }) => {
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Validar estructura del CSV
  const validateCSVStructure = (data) => {
    if (!data || data.length === 0) {
      throw new Error('El archivo CSV está vacío');
    }

    const requiredColumns = ['Equipo', 'IP', 'Red', 'Mascara', 'VLAN'];
    const headers = Object.keys(data[0]);

    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Columnas faltantes en el CSV: ${missingColumns.join(', ')}`);
    }

    return true;
  };

  // Filtrar filas incompletas o vacías
  const cleanCSVData = (data) => {
    return data.filter(row => 
      row.Equipo && row.IP && row.Red && row.Mascara && row.VLAN &&
      row.Equipo.trim() !== '' &&
      row.IP.trim() !== '' &&
      row.Red.trim() !== '' &&
      row.Mascara.trim() !== '' &&
      row.VLAN.trim() !== ''
    );
  };

  // Procesar el archivo
  const processFile = (file) => {
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      onError('Por favor, selecciona un archivo CSV válido');
      return;
    }

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          validateCSVStructure(results.data);
          const cleanedData = cleanCSVData(results.data);

          if (cleanedData.length === 0) {
            throw new Error('No se encontraron filas válidas en el CSV');
          }

          // Convertir VLAN a número si es necesario y limpiar IP/red
          const parsedData = cleanedData.map(row => ({
            Equipo: row.Equipo.trim(),
            IP: row.IP.trim(),
            Red: row.Red.trim(),
            Mascara: row.Mascara.trim(),
            VLAN: row.VLAN.trim()
          }));

          onNetworksLoaded(parsedData);
          onError(null);
        } catch (error) {
          onError(error.message);
          setFileName('');
        }
      },
      error: (error) => {
        onError(`Error al procesar el archivo: ${error.message}`);
        setFileName('');
      }
    });
  };

  // Manejadores de archivo y drag & drop
  const handleFileChange = (e) => processFile(e.target.files[0]);
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Cargar Tabla de Redes (CSV)
      </label>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="network-upload"
        />
        <label
          htmlFor="network-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          <svg
            className="w-12 h-12 text-gray-400 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {fileName ? (
            <p className="text-sm text-gray-700 font-medium">{fileName}</p>
          ) : (
            <>
              <p className="text-sm text-gray-700 mb-1">
                Arrastra un archivo CSV aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-gray-500">
                Formato: Equipo, IP, Red, Mascara, VLAN
              </p>
            </>
          )}
        </label>
      </div>
    </div>
  );
};

export default NetworkUploader;
