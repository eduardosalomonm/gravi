# Gravi mobile verification — 2026-09-05

The original 390 × 844 browser check reproduced a 1000 px main element (`pass: false`). The original mobile stylesheet forced that minimum height while keeping desktop panels visible over the garden.

The final app uses a dynamic viewport height, mobile controls and closed-by-default bottom sheets. The scene is resized independently of the controls. A desktop media query retains the larger panels and keyboard instructions.

| Viewport   | No document overflow | Default panels | Controls         |
| ---------- | -------------------- | -------------- | ---------------- |
| 320 × 568  | Passed               | Hidden         | Joystick + jump  |
| 390 × 844  | Passed               | Hidden         | Joystick + jump  |
| 430 × 932  | Passed               | Hidden         | Joystick + jump  |
| 844 × 390  | Passed               | Hidden         | Joystick + jump  |
| 1280 × 800 | Passed               | Visible        | Keyboard + mouse |

Browser checks use the real local app and its rendered DOM. The regression criterion is `document.documentElement.scrollHeight <= innerHeight` and `scrollWidth <= innerWidth`, plus hidden gravity/quest panels on mobile and visible touch controls. Screenshots were visually inspected in portrait, short portrait, landscape and desktop.

Interaction checks: open/close gravity and quest sheets; select zero gravity; use on-screen Jump (height increased and status changed to floating); return to start (height returned to 0.0 m); drag/release joystick (Gravi moved, thumb returned to center); change the continuous slider to 0.01. No browser console errors were recorded during these checks.

The 94 Node tests cover garden and spherical physics, the 45 m planet scale, all five gravity references, every large solid object, Jupiter collision regression, visible platform alignment, ten planet challenges, touch-vector mapping, clamping, simultaneous steering/jumping and stopping after release. Lint and the production build also pass.

Limit: viewport and pointer simulation on a desktop browser, not a physical iOS/Android device. Hardware multitouch, device performance and real safe-area insets still need device testing.

## Saved progress, personality and new adventures

The Mac now serves the app on `http://192.168.1.36:3002/` for same-Wi-Fi phone access; an HTTP request and browser navigation to that exact origin succeeded. No external publishing or router forwarding was performed.

The expanded app has five relaxed challenges and one optional 30-second firefly race. Unit tests verify moving-platform carry and jump reachability, the zero-gravity return puzzle, local save/load and malformed/denied storage, visual-only reactions, race ordering, timeout/cancellation, a complete reachable race route and persistent best time. There are 53 passing tests.

The user's confirmed personality is curious/playful, with expressions and movement only. Speech/audio code was removed. Browser UI checks verified saved gravity/personality after reload and the new quest/race controls. The default mobile layout still keeps the menus closed and the play area available.

Final browser checks on the Wi-Fi origin: the optional race starts from its quest card, displays its countdown, remains unchanged while paused, and cancellation hides the race HUD and returns to free exploration. Browser console error list was empty. The 320 × 568 and 844 × 390 layouts passed the no-overflow/closed-menu checks again after the new features.

## Tutorial and planet — 2026-09-07

- 390 × 844: first-run choice fits without scrolling; planet, joystick, jump, gravity sheet, menu and return button remain visible and usable.
- 844 × 390: garden, touch controls and bottom menu fit without overlap.
- 1280 × 720: the gravity panel sits to the left of the planet so Gravi remains visible.
- The menu opens practice and allows repeating the tutorial. Reload after a first choice enters the planet directly.
- Automated spherical-physics checks cover a full great circle, both poles, every nonzero gravity reference, zero-gravity flight, re-attraction and reset.

## Sólidos y secretos — 2026-09-07

- 390 × 844: sin desbordamiento; controles principales visibles y lista de diez secretos desplazable dentro del menú.
- 844 × 390: sin desbordamiento; joystick, salto y barra inferior accesibles.
- La captura del planeta confirma que árboles, arbustos, rocas y plataformas nacen en la superficie y se orientan con su normal local.
- Las pruebas de regresión reproducen el antiguo cruce de troncos y rocas bajas con Júpiter. La detección continua de laterales y aterrizajes impide ambos casos.
- La geometría visual y sus 434 sólidos se generan desde la misma definición. Hierba y flores permanecen atravesables por diseño.
- No se registraron errores ni advertencias en la consola del navegador durante la revisión.

## Plataformas, pistas y composición — 2026-09-07

- La superficie física de cada plataforma usa el mismo plano tangente que su tapa visible; una prueba de aterrizaje cerca del borde verifica que los pies quedan exactamente sobre ese plano.
- La cámara móvil parte de un ángulo más alto para mantener a Gravi visible cuando está detrás de una plataforma.
- Los diez retos muestran nombre y pista, permanecen accesibles en cualquier orden y el menú cabe con desplazamiento interno a 390 × 844.
- El inicio incorpora manchas de pradera pegadas a la curvatura, un sendero de pequeñas piedras y grupos de flores. La plataforma más alta lleva una bandera para reforzar su identidad visual.

## Recogida y orientación de gravedad — 2026-09-05

- Reproducido y corregido el contacto visible sin recogida en estrella y luciérnagas: detección por volumen del cuerpo de Gravi, con tolerancia al borde.
- 60 pruebas automáticas pasan; TypeScript, lint y build completados.
- Navegador a 390×844: usando el joystick se recogió la estrella, contador 0→1, ayuda de proximidad y marca ✓ visibles.
- Pulsar Luna sincroniza la barra a 1,62; Home establece 0 y End 12. Referencias ordenadas Cero, Luna, Marte, Tierra; menos a la izquierda y más a la derecha.
- Inspección visual adicional a 320×568 y 844×390: ayuda y controles accesibles. Sin errores de consola. No probado en un teléfono físico.
