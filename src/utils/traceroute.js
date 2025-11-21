/**
 * Algoritmo de Traceroute basado en la nueva tabla de redes con IP de gateway
 */

const ipToNumber = (ip) => {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
};

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

// Validar si una IP pertenece a alguna red de un equipo
const validateIPInEquipmentNetworks = (equipment, ip, networkData) => {
  const networks = networkData.filter(n => n.Equipo === equipment);
  return networks.some(n => isIPInNetwork(ip, n.Red, n.Mascara));
};

// Buscar siguiente equipo según IP de gateway
const findNextEquipmentByGatewayIP = (gatewayIP, networkData) => {
  const entry = networkData.find(n => n.IP === gatewayIP);
  return entry ? entry.Equipo : null;
};

// Buscar ruta más específica en tabla de ruteo
const findRouteEntry = (equipmentName, destIP, routingTable) => {
  const equipmentRoutes = routingTable.filter(r => r.Equipo === equipmentName);
  const matches = equipmentRoutes.filter(r => isIPInNetwork(destIP, r.IP_Destino, r.Mascara));


  if (matches.length > 0) {
    return matches.reduce((best, current) => {
      const bestMask = parseInt(best.Mascara.replace('/', ''));
      const currentMask = parseInt(current.Mascara.replace('/', ''));
      return currentMask > bestMask ? current : best;
    });
  }

  const defaultRoute = equipmentRoutes.find(r => 
    r.IP_Destino === "0.0.0.0" && r.Mascara === "/0"
  );

  return defaultRoute || null;
};

// Función principal
export const executeTraceroute = (sourceEquipment, sourceIP, destIP, routingTable, networkData) => {
  const hops = [];
  const visitedEquipment = new Set();
  let currentEquipment = sourceEquipment;
  const MAX_HOPS = 30;

  // Validaciones iniciales
  if (!sourceEquipment || !sourceIP || !destIP || !routingTable || routingTable.length === 0) {
    return { success: false, error: 'Parámetros inválidos o tabla de ruteo vacía', hops };
  }

  const equipmentExists = routingTable.some(r => r.Equipo === sourceEquipment);
  if (!equipmentExists) {
    return { success: false, error: `El equipo "${sourceEquipment}" no existe en la tabla de ruteo`, hops };
  }

  if (!validateIPInEquipmentNetworks(sourceEquipment, sourceIP, networkData)) {
    return { success: false, error: `La IP de origen ${sourceIP} no pertenece a ninguna red del equipo "${sourceEquipment}"`, hops };
  }

  // Algoritmo de traceroute
  for (let hopCount = 0; hopCount < MAX_HOPS; hopCount++) {
    if (visitedEquipment.has(currentEquipment)) {
      return { success: false, error: `Loop detectado en "${currentEquipment}"`, hops };
    }
    visitedEquipment.add(currentEquipment);

    // Verificar si IP destino ya está en alguna red del equipo actual
    if (validateIPInEquipmentNetworks(currentEquipment, destIP, networkData)) {
      hops.push({ currentEquipment, destNetwork: 'Directo', gateway: null, reachedDestination: true });
      return { success: true, error: null, hops };
    }

    // Buscar ruta en tabla de ruteo
    const routeEntry = findRouteEntry(currentEquipment, destIP, routingTable);
    if (!routeEntry) {
      return { success: false, error: `No existe ruta hacia ${destIP} desde "${currentEquipment}"`, hops };
    }

    // Si la ruta es directa
    if (routeEntry.Gateway.toLowerCase() === 'directo') {
      hops.push({ currentEquipment, destNetwork: `${routeEntry.IP_Destino}${routeEntry.Mascara}`, gateway: 'directo', reachedDestination: true });
      return { success: true, error: null, hops };
    }

    // Encontrar siguiente equipo según IP del gateway
    const nextEquipment = findNextEquipmentByGatewayIP(routeEntry.Gateway, networkData);
    if (!nextEquipment) {
      return { success: false, error: `No se puede resolver el gateway ${routeEntry.Gateway} desde "${currentEquipment}"`, hops };
    }

    hops.push({
      currentEquipment,
      destNetwork: `${routeEntry.IP_Destino}${routeEntry.Mascara}`,
      gateway: routeEntry.Gateway,
      nextEquipment,
      reachedDestination: false
    });

    currentEquipment = nextEquipment;
  }

  return { success: false, error: `Se excedió el límite de ${MAX_HOPS} saltos`, hops };
};

// Validación de IP
export const validateIP = (ip) => {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) return false;
  return ip.split('.').every(p => { const n = parseInt(p); return n >= 0 && n <= 255; });
};
