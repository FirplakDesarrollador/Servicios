export interface ProductItem {
    grupo: string;
    medida: string;
    observaciones: string;
    cantidadPersonas?: number;
    tieneCalentadorGas?: boolean;
}

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

    // Información de Productos Múltiples
    productos?: ProductItem[];

    // Legacy / Fallback Fields (kept for backwards compatibility during transition)
    grupo?: string;
    medida?: string;
    observaciones?: string;
    cantidadPersonas?: number;
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
