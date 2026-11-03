// Lectura de los comentarios de MAC por temas: qué se está reportando y con quién hablarlo.
// No usa IA: es una lista de patrones sobre el lenguaje real de los radicados. Para sumar un tema basta
// agregar una fila. Los comentarios son solo datos: nunca se ejecutan ni se envían fuera de la aplicación.
import type { RegistroMAC } from '../types';

export interface Tema {
    id: string;
    nombre: string;
    /** Área con la que se recomienda hablar cuando este tema domina */
    area: string;
    patron: RegExp;
}

// Se busca sobre texto en minúsculas y sin tildes.
export const TEMAS: Tema[] = [
    {
        id: 'empaque', nombre: 'Empaque deteriorado o insuficiente', area: 'Diseño (empaque)',
        patron: /(empaque|embalaje|caja|guacal|huacal|estiba)[^.\n]{0,60}(mal estado|danad|deterior|rot[oa]|golpe|humed|debil|insuficiente|aplast|impacto)|(mejor|mal|sin|poco) (empaque|embalaje)|(danad|golpe|rot[oa]|impacto|deterior)[^.\n]{0,40}(empaque|embalaje|caja|guacal|huacal)/,
    },
    {
        id: 'golpe', nombre: 'Golpes, quiebres o despiques', area: 'Logística (transportadora)',
        patron: /golpe|impacto|quebrad|partid|desportill|despic|averi|fractur/,
    },
    {
        id: 'faltante', nombre: 'Faltantes o despacho incompleto', area: 'Logística (despachos)',
        patron: /faltan|incomplet|no llego|no llegaron|llego sin|llegaron sin|sin soportes|sin tarugos/,
    },
    {
        id: 'repetida', nombre: 'Piezas repetidas', area: 'Producción y Logística',
        patron: /repetid|duplicad/,
    },
    {
        id: 'referencia', nombre: 'Referencia o pedido equivocado', area: 'Comercial y Logística',
        patron: /referencia (errada|incorrecta|equivocada)|mal despach|error (al crear|en el pedido|humano|de digit)|pedido (errado|equivocado)|color (errado|incorrecto|equivocado)|se equivoc|solicito mal/,
    },
    {
        id: 'acabado', nombre: 'Acabado o defecto de fabricación', area: 'Calidad y Producción',
        patron: /rayad|mancha|fisur|burbuja|blister|acabado|tono|inflad|hinchad|defecto de fabrica|madera/,
    },
    {
        id: 'funcionamiento', nombre: 'Fugas o fallas de funcionamiento', area: 'Calidad y Servicio Técnico',
        patron: /fuga|gote|no enciende|no funciona|no prende|falla|sulfat|motor|bomba|pulsador|pasando agua/,
    },
    {
        id: 'instalacion', nombre: 'Medidas, armado o instalación', area: 'I+D y Servicio Técnico',
        patron: /no encaja|no coincide|no permite|mal en medida|medida incorrect|perforacion|ranura|falla de diseno|poco espacio/,
    },
    {
        id: 'demora', nombre: 'Demoras en entrega o solución', area: 'Logística y MAC',
        patron: /demora|retraso|no ha llegado|sigue sin|lleva .{0,20}(dias|semanas|meses)|sin respuesta/,
    },
];

export interface ComentarioHilo {
    numero_radicado: string;
    comentario: string | null;
    adjuntos: any;
}

export interface LecturaRadicado {
    temas: string[];
    /** Enlaces de las fotos adjuntas en el hilo del radicado */
    fotos: string[];
    /** Un fragmento de lo que escribió el agente, por tema */
    citas: Record<string, string>;
}

const sinTildes = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const EXT_IMAGEN = /\.(jpe?g|png|gif|webp|heic)(\?|$)/i;

const esFoto = (a: any) => String(a?.type || '').startsWith('image/') || EXT_IMAGEN.test(String(a?.url || a?.name || ''));

/** Fragmento original alrededor de lo encontrado; se quitan números largos (guías, documentos, teléfonos). */
function citaDe(original: string, normal: string, patron: RegExp): string {
    const m = patron.exec(normal);
    if (!m) return '';
    const desde = Math.max(0, m.index - 60);
    const texto = original.slice(desde, m.index + m[0].length + 70).replace(/\b\d{5,}\b/g, '#').replace(/\s+/g, ' ').trim();
    return `${desde > 0 ? '…' : ''}${texto}…`;
}

export function leerRadicados(data: RegistroMAC[], hilo: ComentarioHilo[]): Map<number, LecturaRadicado> {
    const porRadicado = new Map<string, ComentarioHilo[]>();
    hilo.forEach((c) => {
        const lista = porRadicado.get(c.numero_radicado);
        if (lista) lista.push(c);
        else porRadicado.set(c.numero_radicado, [c]);
    });

    const salida = new Map<number, LecturaRadicado>();
    for (const r of data) {
        const comentarios = porRadicado.get(r.consecutivo) || [];
        const original = [r.comentarios, ...comentarios.map((c) => c.comentario)].filter(Boolean).join('\n');
        // sinTildes conserva la longitud solo sin tildes combinadas: se normaliza carácter a carácter para que la cita coincida
        const normal = Array.from(original).map((ch) => (sinTildes(ch) || ch).charAt(0)).join('');
        const lectura: LecturaRadicado = { temas: [], fotos: [], citas: {} };
        for (const tema of TEMAS) {
            if (tema.patron.test(normal)) {
                lectura.temas.push(tema.id);
                lectura.citas[tema.id] = citaDe(Array.from(original).join(''), normal, tema.patron);
            }
        }
        comentarios.forEach((c) => {
            if (Array.isArray(c.adjuntos)) c.adjuntos.filter(esFoto).forEach((a: any) => lectura.fotos.push(a.url));
        });
        salida.set(r.id, lectura);
    }
    return salida;
}

export interface TemaResumido {
    tema: Tema;
    radicados: number;
    fotos: number;
    cita: string;
}

/** Temas de un grupo de radicados, del más reportado al menos. */
export function resumirTemas(ids: Iterable<number>, lecturas: Map<number, LecturaRadicado>): TemaResumido[] {
    const conteo = new Map<string, TemaResumido>();
    for (const id of ids) {
        const lectura = lecturas.get(id);
        if (!lectura) continue;
        lectura.temas.forEach((idTema) => {
            let t = conteo.get(idTema);
            if (!t) {
                t = { tema: TEMAS.find((x) => x.id === idTema)!, radicados: 0, fotos: 0, cita: lectura.citas[idTema] || '' };
                conteo.set(idTema, t);
            }
            t.radicados += 1;
            t.fotos += lectura.fotos.length;
        });
    }
    return [...conteo.values()].sort((a, b) => b.radicados - a.radicados);
}
