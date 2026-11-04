import { useCallback, useEffect, useState, type DependencyList, type UIEvent } from 'react';

/**
 * Carga progresiva de filas para tablas con scroll interno: se dibujan primero `initial` filas y se
 * agregan `step` más cada vez que el scroll llega cerca del final. Las tablas de Indicadores MAC pueden
 * tener cientos de filas aunque solo se vean ~12; dibujarlas todas en cada cambio de filtro era lo que
 * hacía lenta la pantalla. Búsquedas, clics y totales siguen trabajando sobre todos los datos.
 * El límite vuelve a `initial` cuando cambian `resetDeps` (datos o texto de búsqueda).
 */
export function useRowLimit(resetDeps: DependencyList, initial = 40, step = 100) {
    const [limit, setLimit] = useState(initial);

    useEffect(() => {
        setLimit(initial);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, resetDeps);

    const onScroll = useCallback((e: UIEvent<HTMLElement>) => {
        const el = e.currentTarget;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 160) setLimit((l) => l + step);
    }, [step]);

    return { limit, onScroll };
}
