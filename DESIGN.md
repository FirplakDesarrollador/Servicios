# Diseño: vidrio líquido

Superficies de vidrio sobre un fondo de formas líquidas que cambian lentamente. Es una herramienta de trabajo: el efecto vive en el fondo y en los bordes; las tablas y los números siempre se leen primero.

## Color
Navy, verde oliva, crema y negro. Los tokens viven en `src/app/globals.css` y cambian por tema.

| Papel | Claro | Oscuro |
|---|---|---|
| Lienzo | `#efe7d5` | `#0c1119` |
| Navy (rellenos) | `#1b3250` | `#274468` |
| Oliva (acento) | `#66753a` | `#76863f` |
| Texto | `#14181f` | `#f4efe2` |
| Alerta | `#a4622a` | `#dd9a5d` |

- No escribir colores a mano: usar `--c-*` y `--serie-*`, o las clases de Tailwind.
- `slate`, `stone` y `gray` son los neutros de la paleta; `indigo`, `blue` y `sky` son navy; `emerald`, `green` y `teal` son oliva.
- `red` y `amber` quedan para estados de error y advertencia.

## Vidrio
- Tarjetas: toda `.bg-white` redondeada recibe el vidrio desde `globals.css`. No hay que añadir clases.
- Las tarjetas no usan `backdrop-filter`: confina modales y menús internos y pesa con muchas tarjetas. El fondo ya está desenfocado.
- `backdrop-filter` real solo en lo que flota sobre contenido: encabezados fijos y modales.
- Menús, modales, encabezados de tabla pegajosos y campos van casi opacos para que se lean.

## Liquid Morph
- Fondo: cuatro formas con `border-radius` y `transform` animados, entre 29 y 47 segundos.
- Tarjetas: cambian de forma despacio al pasar el cursor.
- Se detiene con `prefers-reduced-motion`. Sin movimiento dentro de los datos.

## Apariencia
`src/components/Apariencia.tsx`: tema Claro, Oscuro o Sistema y transparencia de 5 a 70 %, guardados por usuario en su navegador. Disponible en el botón flotante y en Configuración. El tema se aplica antes de pintar con `SCRIPT_APARIENCIA`.

## Tipografía
Outfit en toda la interfaz; números tabulares en datos.
