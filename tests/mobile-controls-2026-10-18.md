# Gravi · controles móviles · 18 de octubre de 2026

## Cambios

- Joystick relativo al primer contacto: apoyar el dedo fuera del centro no inicia una marcha involuntaria. Zona neutra del 10 % y curva de respuesta gradual para pasos precisos; un arrastre amplio conserva la velocidad máxima.
- Centro visual del joystick corregido, tamaño de 112 px en vertical y 96 px en horizontal bajo. Botón de salto de 92 px en vertical y 84 px en horizontal bajo. La rueda de gravedad se ajusta a móviles estrechos.
- Liberación de movimiento y aspecto pulsado al cancelar, abrir menú, pausar, perder foco o cambiar orientación. El salto responde al contacto y acepta activación con teclado sin duplicarse.
- Cámara con umbral de 5 px, sensibilidad menor y giro amortiguado. Una pinza no orbita; al levantar un dedo se recalcula el origen para evitar saltos de cámara. Los contactos del joystick y del salto no forman parte de la pinza.
- Las celebraciones no giran el rumbo. Se conservan su acercamiento y efectos de recompensa.
- Se sustituye el botón contextual de regreso por «Para bajar más rápido, cambia la gravedad a Tierra o Júpiter». Aparece en vuelo a más de 4 m con gravedad inferior a 6 m/s², desaparece al aterrizar o subir la gravedad y no intercepta toques. El regreso al inicio permanece en el menú. Se evitan avisos superpuestos y la altura no se dibuja detrás de la tarjeta de un reto activo.

## Comprobación en navegador

El ejecutor [browser/mobile-controls.mjs](browser/mobile-controls.mjs) usa contactos táctiles del navegador mediante CDP, el componente real de controles y el bucle de física de `createPlanetGame`. Los casos se ejecutan en perfiles locales aislados, nunca sobre la partida pública.

| Comprobación                                                           | 320 × 568 | 390 × 844 | 844 × 390 |
| ---------------------------------------------------------------------- | --------- | --------- | --------- |
| Botones dentro de pantalla, separados y de al menos 44 px              | Pasa      | Pasa      | Pasa      |
| Apoyo fuera del centro sin movimiento; temblor ignorado                | Pasa      | Pasa      | Pasa      |
| Paso lento y velocidad máxima con el joystick real                     | Pasa      | Pasa      | Pasa      |
| Joystick + salto + giro con tres dedos simultáneos                     | Pasa      | Pasa      | Pasa      |
| Cancelación libera controles y frena el salto                          | Pasa      | Pasa      | Pasa      |
| Pinza sin giro; levantar un dedo sin salto de cámara                   | Pasa      | Pasa      | Pasa      |
| Ángulo de cámara conservado al soltar                                  | Pasa      | Pasa      | Pasa      |
| Menú y pausa liberan el joystick; el gesto viejo no lo reactiva        | Pasa      | Pasa      | Pasa      |
| Salto lunar muestra pista; Tierra permite aterrizar sin teletransporte | Pasa      | Pasa      | Pasa      |
| Activación del salto con teclado una sola vez                          | Pasa      | Pasa      | Pasa      |
| Girar la pantalla cancela el gesto; un toque nuevo funciona            | Pasa      | Pasa      | Pasa      |
| Sin desplazamiento vertical del documento                              | Pasa      | Pasa      | Pasa      |

Sin errores de ejecución del navegador. Los resultados compactos están en [mobile-controls-results.json](mobile-controls-results.json). También pasan las **170 pruebas unitarias** y la nueva ejecución de los **30 recorridos** de reto/personaje, incluidos sus casos adicionales de gravedad, colisión, recompensa y recarga.

Además, se completaron los tres pasos del tutorial a 390 × 844 con el reloj normal y sin instrumentación del motor: caminar con el joystick, tocar Saltar y elegir Luna mediante la rueda. La tarjeta confirmó el tutorial completado, sin errores de ejecución.

## Repetir y límites

Con el servidor local en el puerto 3107, ejecutar `npm run test:mobile`. Se admite otro puerto local mediante `GRAVI_QA_URL`, otra carpeta de evidencias mediante `GRAVI_QA_OUTPUT` y otro Chrome/Chromium mediante `GRAVI_CHROME_PATH`.

La prueba controla el reloj de animación; la instrumentación vive solo en las respuestas interceptadas del navegador de prueba. Los saltos y desplazamientos usan la física normal, con una posición inicial de prueba en un claro. Las capturas de los saltos lunares sí se dibujan. No mide rendimiento ni sustituye la valoración del tacto en un teléfono físico; Safari iOS no se ha probado en esta ronda.
