import { supabase } from '@/lib/supabase';
import { parseLocalTimestamp } from '@/lib/dateUtils';
import html2pdf from 'html2pdf.js';

const escapeHtml = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '---';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const formatReportValue = (value: unknown) => escapeHtml(value);

const formatReportDateTime = (value: string | null | undefined) => {
    if (!value) return '---';
    const parsedLocal = parseLocalTimestamp(value);
    const date = parsedLocal && !Number.isNaN(parsedLocal.getTime()) ? parsedLocal : new Date(value);

    if (Number.isNaN(date.getTime())) return escapeHtml(value);

    return date.toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
};

const formatReportDate = (value: string | null | undefined) => {
    if (!value) return '---';
    const parsedLocal = parseLocalTimestamp(value);
    const date = parsedLocal && !Number.isNaN(parsedLocal.getTime()) ? parsedLocal : new Date(value);

    if (Number.isNaN(date.getTime())) return escapeHtml(value);

    return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
};

const buildReportRows = (rows: Array<[string, unknown]>) => rows.map(([label, value]) => `
    <tr>
        <th>${escapeHtml(label)}</th>
        <td>${formatReportValue(value)}</td>
    </tr>
`).join('');

const getSignatureSrc = (base64String: string) => {
    if (!base64String) return '';
    return base64String.startsWith('data:image') 
        ? base64String 
        : `data:image/png;base64,${base64String}`;
};

export const generateConsecutivoPDF = async (consecutivo: string, currentUser: any) => {
    try {
        // Fetch services
        const { data: services, error: servicesError } = await supabase
            .from('query_servicios')
            .select('*')
            .eq('consecutivo', consecutivo)
            .order('created_at', { ascending: true });

        if (servicesError) throw servicesError;
        if (!services || services.length === 0) throw new Error('No se encontraron servicios para este consecutivo');

        const serviceIds = services.map(s => s.id);
        const mainService = services[0]; // For general client info

        // Fetch comments
        const { data: comments, error: commentsError } = await supabase
            .from('query_comentarios')
            .select('*')
            .in('servicio_id', serviceIds)
            .order('created_at', { ascending: true });

        // Fetch visits (for signatures and visit details)
        const { data: visits, error: visitsError } = await supabase
            .from('query_visita_firma')
            .select('*')
            .in('servicio_id', serviceIds)
            .order('fecha_hora_inicio', { ascending: true });

        const generatedAtText = new Date().toLocaleString('es-CO', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });

        // 1. Client Information (from mainService)
        const clientInfoRows = buildReportRows([
            ['Cliente', mainService.cliente_nombre || '---'],
            ['Identificación', mainService.cliente_nit || mainService.consumidor_cedula || '---'],
            ['Nombre Contacto', mainService.consumidor_contacto || mainService.ubicacion_contacto || '---'],
            ['Teléfono', mainService.consumidor_telefono || mainService.ubicacion_telefono || '---'],
            ['Correo', mainService.consumidor_correo || '---'],
            ['Dirección', mainService.consumidor_direccion || mainService.ubicacion_direccion || '---'],
            ['Ciudad', mainService.consumidor_ciudad || mainService.ubicacion_ciudad || '---'],
        ]);

        // 3. Todos los servicios
        const servicesHtml = services.map((srv, idx) => {
            const status = srv.estado !== false ? 'Abierto' : 'Cerrado';
            const generalRows = buildReportRows([
                ['Tipo de servicio', srv.tipo_de_servicio],
                ['Fecha solicitud', formatReportDate(srv.created_at)],
                ['Coordinador', srv.coordinador_nombre],
                ['Técnico Asignado', srv.tecnico_nombre],
                ['Fecha Cierre', srv.fecha_cierre ? formatReportDate(srv.fecha_cierre) : '---'],
                ['Descripción', srv.actividad_mac || srv.razon_cierre || '---']
            ]);

            const srvVisits = (visits || []).filter(v => v.servicio_id === srv.id);
            const visitRows = srvVisits.length > 0
                ? srvVisits.map((visit, vIdx) => {
                    const isCancelled = visit.estado === false && (!!visit.motivo_cancelacion || visit.reagendado);
                    const visitStatus = visit.estado === true ? 'Activa' : isCancelled ? 'Cancelada / reagendada' : 'Terminada';
                    return `
                        <tr>
                            <td>${vIdx + 1}</td>
                            <td>${escapeHtml(visitStatus)}</td>
                            <td>${formatReportDateTime(visit.fecha_hora_inicio)}</td>
                            <td>${formatReportDateTime(visit.fecha_hora_fin_real)}</td>
                            <td>${formatReportValue(visit.diagnostico_servicio)}</td>
                            <td>${formatReportValue(visit.trabajo_realizado_servicio)}</td>
                        </tr>
                    `;
                }).join('')
                : '<tr><td colspan="6" class="empty">No hay programaciones/visitas para este servicio.</td></tr>';

            return `
                <div class="service-box">
                    <h3>Servicio #${idx + 1} (ID: ${srv.id})</h3>
                    <table><tbody>${generalRows}</tbody></table>
                    
                    <h4 style="margin-top: 15px; margin-bottom: 5px;">Programación / Visitas</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Estado</th>
                                <th>Inicio Programado</th>
                                <th>Fin Real</th>
                                <th>Diagnóstico</th>
                                <th>Trabajo Realizado</th>
                            </tr>
                        </thead>
                        <tbody>${visitRows}</tbody>
                    </table>
                </div>
            `;
        }).join('');

        // 4. Historial completo de comentarios
        const commentsHtml = (comments || []).length > 0
            ? (comments || []).map((comment) => `
                <div class="comment-item">
                    <div class="comment-header">
                        <strong>${formatReportValue(comment.display_name || comment.usuario_nombre)}</strong>
                        <span>${formatReportDateTime(comment.created_at)}</span>
                        <span>(Servicio ID: ${comment.servicio_id})</span>
                    </div>
                    <div class="comment-body">${formatReportValue(comment.contenido)}</div>
                </div>
            `).join('')
            : '<div class="empty">No hay comentarios registrados.</div>';

        // 5. Evidencias (fotos)
        const allEvidences: any[] = [];
        (comments || []).forEach(c => {
            if (Array.isArray(c.documentos) && c.documentos.length > 0) {
                c.documentos.forEach((doc: string) => {
                    // Solo intentar renderizar imágenes
                    const ext = doc.split('.').pop()?.toLowerCase();
                    if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                        allEvidences.push({
                            url: doc,
                            servicioId: c.servicio_id,
                            autor: c.display_name || c.usuario_nombre,
                            fecha: formatReportDateTime(c.created_at)
                        });
                    }
                });
            }
        });

        const evidencesHtml = allEvidences.length > 0
            ? `<div class="evidences-grid">
                ${allEvidences.map(ev => `
                    <div class="evidence-card">
                        <img src="${escapeHtml(ev.url)}" alt="Evidencia" />
                        <div class="evidence-meta">
                            Servicio ID: ${ev.servicioId}<br/>
                            Por: ${escapeHtml(ev.autor)}<br/>
                            ${escapeHtml(ev.fecha)}
                        </div>
                    </div>
                `).join('')}
               </div>`
            : '<div class="empty">No hay evidencias fotográficas registradas.</div>';

        // 6. Firmas
        const signatures: any[] = [];
        (visits || []).forEach(v => {
            if (v.firma_base64) {
                signatures.push({
                    src: getSignatureSrc(v.firma_base64),
                    servicioId: v.servicio_id,
                    fecha: formatReportDateTime(v.fecha_hora_fin_real || v.updated_at),
                    nombre: v.nombre_persona_recibe || '---',
                    cedula: v.cedula_persona_recibe || '---'
                });
            }
        });

        const signaturesHtml = signatures.length > 0
            ? `<div class="signatures-grid">
                ${signatures.map(sig => `
                    <div class="signature-card">
                        <img src="${sig.src}" alt="Firma del cliente" style="border-bottom: 1px solid #e2e8f0; margin-bottom: 8px; padding-bottom: 8px;"/>
                        <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 2px;">${escapeHtml(sig.nombre)}</div>
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">C.C: ${escapeHtml(sig.cedula)}</div>
                        <div class="evidence-meta">
                            Servicio ID: ${sig.servicioId}<br/>
                            Fecha Captura: ${escapeHtml(sig.fecha)}
                        </div>
                    </div>
                `).join('')}
               </div>`
            : '<div class="empty">Firma del cliente no registrada.</div>';

        const htmlContent = `<!doctype html>
        <html lang="es">
        <head>
            <meta charset="utf-8" />
            <title>Ficha PDF Consecutivo ${escapeHtml(consecutivo)}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                * { box-sizing: border-box; }
                body { margin: 0; padding: 32px; color: #1e293b; font-family: 'Inter', sans-serif; background: #ffffff; }
                .header-meta { font-size: 11px; color: #94a3b8; text-align: right; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
                h1 { margin: 0 0 8px; font-size: 26px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; }
                h2 { margin: 0 0 16px; font-size: 14px; text-transform: uppercase; color: #3b82f6; font-weight: 600; display: flex; align-items: center; gap: 8px; letter-spacing: 0.1em; }
                h2::before { content: ""; display: block; width: 4px; height: 16px; background: #3b82f6; border-radius: 2px; }
                h3 { margin: 0 0 12px; font-size: 16px; color: #1e293b; font-weight: 600; }
                section { margin-bottom: 32px; page-break-inside: avoid; }
                
                table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; margin-bottom: 12px; border-radius: 6px; border: 1px solid #e2e8f0; overflow: hidden; }
                th, td { padding: 6px 10px; text-align: left; vertical-align: middle; border-bottom: 1px solid #e2e8f0; line-height: 1.4; }
                tr:last-child th, tr:last-child td { border-bottom: none; }
                th { background: #f8fafc; color: #475569; width: 25%; font-weight: 600; border-right: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; }
                td { background: #ffffff; color: #0f172a; }
                thead th { background: #f1f5f9; color: #1e293b; width: auto; border-right: none; border-bottom: 2px solid #e2e8f0; font-size: 10px; }
                
                .service-box { border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; margin-bottom: 24px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
                
                .comment-item { padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; background: #f8fafc; font-size: 12px; }
                .comment-header { color: #64748b; margin-bottom: 8px; display: flex; gap: 12px; font-weight: 500; }
                .comment-header strong { color: #0f172a; font-weight: 600; }
                .comment-body { color: #334155; line-height: 1.6; }
                .evidences-grid, .signatures-grid { display: block; margin-top: 12px; font-size: 0; }
                .evidence-card, .signature-card { display: inline-block; width: calc(33.333% - 26px); vertical-align: top; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; background: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.02); margin: 6px; }
                .evidence-card img, .signature-card img { max-width: 100%; height: 160px; object-fit: cover; border-radius: 4px; }
                .evidence-meta { font-size: 11px; color: #64748b; margin-top: 8px; line-height: 1.5; }
                
                .empty { color: #94a3b8; font-size: 13px; font-style: italic; text-align: center; padding: 24px; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1; }
            </style>
        </head>
        <body>
            <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; gap: 16px;">
                <div style="text-align: left;">
                    <h1 style="margin: 0; font-size: 20px;">Ficha de Servicio Consolidada</h1>
                    <div style="color: #64748b; font-size: 14px;">${escapeHtml(consecutivo)}</div>
                </div>
                <div style="text-align: center; display: flex; justify-content: center;">
                    <img src="${window.location.origin}/logo-firplak.png" alt="Firplak" style="height: 64px; object-fit: contain;" />
                </div>
                <div class="header-meta" style="border: none; margin: 0; padding: 0; text-align: right;">
                    Generado el: ${escapeHtml(generatedAtText)}<br/>
                    Por: ${formatReportValue(currentUser?.display_name || currentUser?.nombres || currentUser?.correo || 'Usuario Sistema')}
                </div>
            </div>
            
            <section>
                <h2>Información del Cliente</h2>
                <table><tbody>${clientInfoRows}</tbody></table>
            </section>
            
            <section>
                <h2>Servicios Asociados</h2>
                ${servicesHtml}
            </section>
            
            <section>
                <h2>Historial de Comentarios</h2>
                ${commentsHtml}
            </section>
            
            <section style="page-break-before: always;">
                <h2>Evidencias Fotográficas</h2>
                ${evidencesHtml}
            </section>
            
            <section>
                <h2>Firmas del Cliente</h2>
                ${signaturesHtml}
            </section>
            
            <div class="footer" style="display: flex; justify-content: space-between; align-items: center; border-top: 4px solid #3b82f6; padding: 24px 0 0 0; margin-top: 32px; color: #64748b; font-size: 11px; line-height: 1.5; background: #ffffff; text-align: left; page-break-inside: avoid;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    <div>
                        <div style="color: #0f172a;">(574) 444 17 71</div>
                        <div>servicioalcliente@firplak.com</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <div>
                        <div style="color: #0f172a;">Autopista Sur Calle 29 # 41-15</div>
                        <div>Itagüí, Antioquia, Colombia.</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="color: #0f172a; font-size: 14px; font-weight: 600;">www.<span style="color: #1e293b;">firplak</span>.com</div>
                    <div style="margin-top: 4px; font-size: 9px; color: #94a3b8;">Generado: ${escapeHtml(generatedAtText)}</div>
                </div>
            </div>
            
        </body>
        </html>`;

        const opt = {
            margin:       [10, 10, 10, 10] as [number, number, number, number],
            filename:     `Ficha_${consecutivo}_${new Date().getTime()}.pdf`,
            image:        { type: 'jpeg' as const, quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, windowWidth: 1024 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
        };

        const container = document.createElement('div');
        container.innerHTML = htmlContent;
        await html2pdf().set(opt).from(container).save();

        return true;
    } catch (err: any) {
        console.error('Error generating PDF:', err);
        throw err;
    }
};
