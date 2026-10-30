# Gravi · recorrido de los diez retos con los tres personajes

Fecha: 18 de octubre de 2026. Código del juego: `b4e1e8b190b448fed4f3640798f25ac054429520`, correspondiente a la versión pública 17.

**Resultado: 30 de 30 combinaciones completadas.** No se detectaron fallos funcionales en los casos comprobados. No fue necesario modificar la física, las reglas de los retos ni los personajes.

| Reto                        | Gravi | Mimo | Pipo |
| --------------------------- | ----- | ---- | ---- |
| El claro que respira        | Pasa  | Pasa | Pasa |
| El sendero de pétalos       | Pasa  | Pasa | Pasa |
| Peldaños al cielo           | Pasa  | Pasa | Pasa |
| El abrazo de Júpiter        | Pasa  | Pasa | Pasa |
| La senda de las luciérnagas | Pasa  | Pasa | Pasa |
| Las tres cornisas           | Pasa  | Pasa | Pasa |
| El reflejo imposible        | Pasa  | Pasa | Pasa |
| El río que sube             | Pasa  | Pasa | Pasa |
| La escalera del viento      | Pasa  | Pasa | Pasa |
| El último florecer          | Pasa  | Pasa | Pasa |

## Saltos y colisiones

Cada personaje completó las siguientes comprobaciones adicionales:

- Salto y aterrizaje con Luna, Marte, Tierra y Júpiter. La altura máxima difiere menos de 0,1 m de la altura balística esperada. Alturas medidas aproximadas: 15,09 m; 6,57 m; 2,47 m; 0,96 m, respectivamente.
- Vuelo con Cero y regreso al activar Tierra. Cambiar la gravedad conserva la velocidad.
- Caída a 80 m/s con Júpiter sobre una roca baja, una plataforma, una aguja de la cumbre y una copa. Se alcanza el apoyo correcto sin atravesarlo.
- Choque lateral y salida junto a una roca y un tronco, sin atravesarlos ni quedar atrapado.
- Salto contra la cara inferior de una copa: detiene el ascenso y permite volver al suelo.
- Comparación de los vértices de los pies dibujados con el apoyo físico. En las comprobaciones de aterrizaje adicionales, la penetración visual máxima registrada fue aproximadamente 8,2 mm, dentro de la tolerancia de animación de 12 cm.
- Regreso al planeta: elimina la velocidad y conserva los retos completados.

Son 15 casos de gravedad y 21 casos de colisión entre los tres personajes, además de los saltos necesarios para completar los retos.

## Secuencias y recompensas

Se verificó una caída deliberada en Peldaños al cielo: reinicia su secuencia sin borrar otros sakuras. Caer después del tercer peldaño de la Escalera del viento conserva su descanso y permite terminar los saltos restantes.

Cada reto florece su sakura y genera una única celebración. Se comprueban también sus efectos permanentes, incluidos faroles, luciérnagas, flores de Júpiter, río y constelaciones. El final se completa con su recorrido combinado, florece el sakura dorado y retira su señal de llegada.

El mapa muestra las diez ilustraciones de recompensa. Tras recargar, los diez sakuras y el personaje elegido se conservan; no vuelve a otorgarse la celebración. No hubo errores de ejecución del navegador.

## Método y límites

Navegador Chrome aislado con pantalla móvil emulada de 390 × 844, servido desde localhost. Se usa el bucle real de `createPlanetGame`, sus entradas de movimiento, salto y gravedad, sus colisiones y sus callbacks de guardado. La instrumentación intercepta módulos únicamente dentro del navegador de prueba; no se incorpora al código publicado.

Para iniciar cada reto se coloca al personaje cerca de la zona. Dentro del recorrido se camina y salta con la física del juego: no se conceden progresos ni aterrizajes artificiales. Se controla el reloj de animación y se omiten dibujos GPU intermedios para acelerar las pruebas, conservando las actualizaciones de física y de los modelos. Los cuadros finales y el mapa sí se dibujan.

Esta validación automatizada no mide rendimiento ni sustituye una partida manual en un teléfono físico. La sensación del joystick, los gestos de cámara y la fluidez en Safari móvil requieren esa revisión. Las pruebas no acceden a la partida pública del usuario.

## Repetir la prueba

Con las dependencias instaladas, iniciar `npm run dev -- --port 3107` y ejecutar `npm run test:playthrough` en otra terminal. En macOS usa Chrome instalado; se puede indicar otro navegador con `GRAVI_CHROME_PATH` o instalar Chromium con `npx playwright install chromium`.

`GRAVI_QA_URL` permite cambiar el puerto local; el ejecutor rechaza servidores públicos. `GRAVI_QA_OUTPUT` selecciona la carpeta donde se guardan resultados y capturas. Los datos numéricos de esta ejecución están en [planet-playthrough-results.json](planet-playthrough-results.json).

Verificación adicional del proyecto: **165 pruebas unitarias aprobadas**, revisión estática y TypeScript aprobados, y auditoría de dependencias sin vulnerabilidades conocidas.
