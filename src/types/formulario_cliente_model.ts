export interface FormularioClienteModel {
    // Información Personal
    tipoPersona: 'Persona Natural' | 'Persona Jurídica';
    numeroId: string;
    razonSocial: string;
    personaContacto?: string;
    correo_electronico: string;
    telefono: string;

    // Información del Servicio
    ciudad: string;
    direccion: string;
    puntoReferencia?: string;
    tipoServicio: string;

    // Información del Producto
    grupo?: string;
    medida?: string;
    observaciones?: string;

    // Hidromasajes specific fields
    cantidadPersonas?: number; // 2 or 4
    tieneCalentadorGas?: boolean;

    // Documentos
    rutUrl?: string;
    facturaUrl?: string;

    // Confirmación
    confirmaRecepcion: boolean;
    valorPagar?: number;

    // Metadata
    consecutivo?: string;
    fechaCreacion?: string;
}

export interface CiudadData {
    id: number;
    ciudad: string;
    zona?: string;
}

export interface PrecioZonaData {
    id: number;
    ciudad: string;
    precio: number;
}

export interface GrupoProductoData {
    id: number;
    nombre: string;
    tipoServicio: string;
}

export interface MedidaProductoData {
    id: number;
    medida: string;
    grupo: string;
    precio: number;
}
