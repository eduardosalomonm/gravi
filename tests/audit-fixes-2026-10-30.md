# Gravi · correcciones de auditoría · 30 de octubre de 2026

## Cambios y protección de partidas

Se mantiene `gravi.progress.v1` y el formato de guardado versión 7. No hay migración que borre zonas ni sakuras. Se conservan los logros antiguos, el récord de la carrera retirada, el personaje, la personalidad, las preferencias y las etapas del final. No se guardan posiciones de vuelo.

Antes de escribir se compara el contenido actual del guardado con el leído por esta sesión. Si otra pestaña lo cambió, la escritura se rechaza y se muestra una pantalla para cargar la partida actualizada. El evento `storage` también detiene la pestaña obsoleta. Un reinicio explícito no se revierte mezclando automáticamente logros de otra pestaña.

| Punto de la auditoría                | Corrección                                                                        | Comprobación                                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Sobrescritura entre pestañas         | Sesión de guardado con comprobación previa y aviso para recargar                  | Dos sesiones unitarias y dos pestañas reales; escritura obsoleta rechazada y recarga con sakura y ajustes intactos |
| Pérdida de gráficos al abrir el mapa | Liberación explícita del contexto al cerrar mapa y escenas                        | 25 aperturas con el reloj normal: el contexto principal sigue activo                                               |
| Teclado activo detrás del menú       | Bloqueo común de entrada y limpieza de teclas al abrir/cerrar paneles             | W mantenida no continúa el recorrido ni se reactiva al cerrar; P pausa y continúa                                  |
| Dependencias vulnerables             | Versiones compatibles corregidas y excepciones acotadas                           | Instalación limpia, auditoría completa y de producción: cero avisos conocidos                                      |
| Dibujo continuo en pausa             | Una actualización al cambiar algo visible; el resto del tiempo se omite la escena | Contador de cuadros estable durante pausa, un redibujado al cambiar personaje y reanudación normal                 |
| Librerías sin uso                    | Retirados 14 paquetes del starter, utilitario y configuración sin consumidores    | Compilación, TypeScript, revisión estática y pruebas de juego                                                      |
| Modos retirados                      | Eliminados carrera, detección de secretos anterior y selección por arco antigua   | Conservación de todos los datos históricos y tutorial completado con reloj normal                                  |
| Pose de salto desconectada           | El evento real activa la reacción de salto                                        | Gravi, Mimo y Pipo estiran el cuerpo al saltar                                                                     |
| Documentación contradictoria         | Instrucciones actualizadas de regreso, gravedad, sonido y celebraciones           | Revisión del README y de la ayuda del tutorial                                                                     |

## Validación

- 159 pruebas unitarias vigentes aprobadas. El total excluye las pruebas de la carrera y algoritmos retirados; añade protección entre sesiones y conservación de todos los campos históricos.
- Revisión estática y TypeScript aprobados.
- 30 de 30 recorridos: diez retos con Gravi, Mimo y Pipo, usando el motor real, entradas de movimiento y salto, recompensas y recarga.
- Los cinco niveles de gravedad por personaje y 21 casos adicionales de colisión pasan en esa matriz.
- Controles móviles aprobados a 320 × 568, 390 × 844 y 844 × 390, incluyendo tres contactos simultáneos, pinza, cancelación, pausa y cambio de orientación.
- `npm run test:regressions` prueba las regresiones descritas con el reloj normal y completa el tutorial mediante contactos táctiles.

Para repetir: iniciar el servidor local en el puerto 3107; ejecutar `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run test:mobile`, `npm run test:playthrough` y `npm run test:regressions`. Los ejecutores de navegador solo admiten localhost/127.0.0.1 y usan perfiles aislados. La construcción de producción se verifica antes de publicar.

## Límites

Chrome con móvil emulado; esta ronda no sustituye una prueba en iPhone/Safari físico ni mide batería o rendimiento del teléfono. Los recorridos de los retos aceleran el reloj y omiten cuadros GPU intermedios; las regresiones de mapa, pausa y tutorial usan el reloj y dibujo normales. Ninguna prueba abre ni reinicia la partida pública del usuario.

Las pestañas que ya estaban abiertas ejecutan el código anterior hasta recargarlas. Recargar todas las pestañas de Gravi activa la protección nueva.
