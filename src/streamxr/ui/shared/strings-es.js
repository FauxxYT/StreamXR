// GENERATED from src/streamxr/shared/strings-es.js by tools/sync-shared.js - edit that file, not this one.
// StreamXR's words in Spanish (Español). A translation of strings-en.js: same keys, see
// that file for how the tables work. Keys left out here show in English.
// Not yet reviewed by a native speaker.
(function (ns) {
  'use strict';

  ns.i18n.add('es', {
    // Video formats.
    'format.flat': 'Pantalla de cine (vídeo normal)',
    'format.360mono': '360°',
    'format.360eac': '360° cubemap (YouTube "mesh")',
    'format.180mono': '180° (VR180)',
    'format.180sbs': '180° 3D lado a lado (los dos ojos en un fotograma)',
    'format.short.flat': 'Pantalla\nde cine',
    'format.short.360mono': '360°',
    'format.short.360eac': '360°\ncubemap',
    'format.short.180mono': '180°',
    'format.short.180sbs': '180° 3D\nlado a lado',

    // The popup and the player's VR button.
    'popup.button': 'Ver en VR (SteamVR)',
    'popup.title': 'Ver en VR',
    'popup.reading': 'Leyendo la información del vídeo…',
    'popup.spatial': '{site} marca este vídeo como 360°/VR. Cambia el formato si se ve mal.',
    'popup.regular': 'Un vídeo normal: se reproduce en una pantalla de cine delante de ti.',
    'popup.noVideo': 'No se está reproduciendo ningún vídeo. Entra en VR igualmente y elige uno en los paneles.',
    'popup.enter': 'Entrar en VR',
    'popup.exit': 'Salir de VR',
    'popup.starting': 'Iniciando…',
    'popup.details': 'Detalles',
    'popup.format': 'Formato',
    'popup.controls': 'Controles',
    'popup.copy': 'Copiar detalles',
    'popup.copied': 'Copiado ✓',
    'popup.copyFailed': 'No se pudo copiar',
    'popup.saveFrame': 'Guardar fotograma',
    'popup.noFrame': 'Aún no hay fotograma que guardar. Reproduce el vídeo primero.',
    'popup.frameFailed': 'No se pudo capturar el fotograma: {error}',
    'popup.noResponse': 'El script de la página de la extensión no respondió. Recarga esta pestaña después de recargar la extensión.',
    'popup.blocked': '{site} bloquea WebXR en esta página. Recarga la pestaña una vez; si sigue igual, envíame los Detalles.',
    'popup.noHeadset': 'No se encontró ningún visor de VR. Chrome solo lo busca al abrirse: inicia SteamVR y conecta el visor (Steam Frame: Streaming Status → tu PC → Advanced → Stream VR without game), luego cierra todas las ventanas de Chrome y vuelve a abrirlo.',
    'popup.stopped': 'La VR se detuvo.',
    'popup.thisSite': 'Este sitio',
    'popup.passthrough': 'Ver tu habitación (passthrough)',
    'popup.passthroughNotYet': 'Aún no disponible: este navegador y este visor no dan la vista de las cámaras a los sitios web.',
    'popup.glass': 'Paneles de cristal',
    'popup.glassNote': 'El vídeo se ve suavemente a través de los paneles de VR. Desactívalo si la VR va a tirones en este PC.',

    // Starting VR and reading the video.
    'vr.cantStart': 'No se pudo iniciar la VR: {error}',
    'vr.blockedFrames': '{site} bloqueó la lectura de los fotogramas de este vídeo (origen cruzado).',
    'vr.cantRead': 'No se pudo leer el vídeo: {error}',

    // The 2D Cinema settings tab.
    'cinema.now': 'Ahora: {format}',
    'cinema.nowNotFlat': 'Ahora: {format} · solo funcionan en la pantalla de cine (vídeos 2D)',
    'cinema.curve': 'Curva',
    'cinema.curveAmount': 'Intensidad de la curva',
    'cinema.distance': 'Distancia',
    'cinema.closer': 'Más cerca',
    'cinema.farther': 'Más lejos',
    'cinema.glow': 'Resplandor',
    'cinema.glowHint': 'Una luz suave alrededor de la pantalla con los colores de sus bordes',
    'cinema.glowStrength': 'Intensidad del resplandor',
    'cinema.glowLength': 'Longitud del resplandor',
    'cinema.shorter': 'Más corto',
    'cinema.longer': 'Más largo',
  });
})(globalThis.__streamxr = globalThis.__streamxr || {});
