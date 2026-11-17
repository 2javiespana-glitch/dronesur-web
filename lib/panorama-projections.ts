// Proyecciones alternativas para las fotos 360° (vista "bola del mundo", planeta, etc.).
// Aquí vive todo lo que NO es React: la lista de vistas, sus ajustes y los shaders de WebGL2.
// El componente que lo usa es components/panorama-projection-viewer.tsx.

// Vistas que dibuja nuestro propio visor WebGL. La vista "pov" (la de siempre) la sigue dando Pannellum.
export type ProjectionMode = 'planet' | 'tunnel' | 'fisheye' | 'globe' | 'flat'
export type ViewMode = 'pov' | ProjectionMode

// Orden en el que se muestran los botones.
export const VIEW_MODES: ViewMode[] = ['pov', 'planet', 'tunnel', 'fisheye', 'globe', 'flat']

export const VIEW_LABELS: Record<ViewMode, { es: string; en: string }> = {
  pov: { es: 'POV 360', en: 'POV 360' },
  planet: { es: 'Planeta', en: 'Planet' },
  tunnel: { es: 'Invertido', en: 'Inverted' },
  fisheye: { es: 'Ojo de pez', en: 'Fisheye' },
  globe: { es: 'Globo', en: 'Globe' },
  flat: { es: 'Plano', en: 'Flat' },
}

export type ProjectionConfig = {
  /** Número que recibe el shader (uMode). */
  id: number
  /** Inclinación con la que arranca la vista (radianes). */
  pitch: number
  /** Límites del zoom y valor inicial. */
  zoom: { min: number; max: number; def: number }
  /** Inclinación máxima permitida arriba/abajo (radianes). En "flat" se calcula según el zoom. */
  maxPitch: number
}

export const PROJECTIONS: Record<ProjectionMode, ProjectionConfig> = {
  // Estereográfica desde el suelo: el dron queda en el centro y el cielo se abre alrededor.
  planet: { id: 0, pitch: 0, zoom: { min: 0.5, max: 3, def: 1 }, maxPitch: 0.9 },
  // Igual pero mirando al cielo: el suelo queda en el borde, como un túnel.
  tunnel: { id: 1, pitch: 0, zoom: { min: 0.5, max: 3, def: 1 }, maxPitch: 0.9 },
  // Objetivo "ojo de pez" de unos 200°.
  fisheye: { id: 2, pitch: 0, zoom: { min: 0.6, max: 3, def: 1 }, maxPitch: 1.45 },
  // Esfera vista desde fuera, que se puede girar con el dedo o el ratón. Arranca mirando al suelo.
  globe: { id: 3, pitch: -0.6, zoom: { min: 0.5, max: 2.4, def: 1 }, maxPitch: 1.45 },
  // La foto entera desplegada (equirrectangular), con zoom y desplazamiento.
  flat: { id: 4, pitch: 0, zoom: { min: 1, max: 6, def: 1 }, maxPitch: Math.PI / 2 },
}

// Un único triángulo que cubre toda la pantalla (no hacen falta buffers).
export const VERTEX_SHADER = /* glsl */ `#version 300 es
void main() {
  vec2 pos = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}
`

// Para cada píxel de la pantalla calcula hacia qué dirección del mundo mira y lee ese color
// de la foto equirrectangular. Cambiando solo cómo se calcula esa dirección salen todas las vistas.
export const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D uTex;
uniform vec2 uRes;      // tamaño del lienzo en píxeles
uniform int uMode;      // 0 planeta · 1 invertido · 2 ojo de pez · 3 globo · 4 plano
uniform float uYaw;     // giro horizontal (radianes)
uniform float uPitch;   // inclinación (radianes)
uniform float uZoom;

out vec4 outColor;

const float PI = 3.14159265358979;
const vec3 BG = vec3(0.03, 0.04, 0.05);

vec3 rotX(vec3 v, float a) {
  float c = cos(a), s = sin(a);
  return vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z);
}

vec3 rotY(vec3 v, float a) {
  float c = cos(a), s = sin(a);
  return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z);
}

// Ejes de la cámara (derecha, arriba, hacia donde mira el centro) para uYaw / uPitch.
mat3 lookBasis() {
  float cp = cos(uPitch);
  vec3 c = vec3(cp * sin(uYaw), sin(uPitch), cp * cos(uYaw));
  vec3 xa = normalize(cross(vec3(0.0, 1.0, 0.0), c));
  vec3 ya = cross(c, xa);
  return mat3(xa, ya, c);
}

void main() {
  float minSide = min(uRes.x, uRes.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * minSide); // el lado corto va de -1 a 1
  float aa = 2.0 / minSide;                                   // un píxel en esas unidades

  vec3 d = vec3(0.0, 0.0, 1.0);
  float u = 0.5;
  float v = 0.5;
  bool useDir = true;
  float cover = 1.0;   // 1 = se ve la foto, 0 = fondo
  float shade = 1.0;
  float halo = 0.0;

  if (uMode <= 1) {
    // Planeta (suelo en el centro) e invertido (cielo en el centro): proyección estereográfica.
    float th = 2.0 * atan(length(p) * 1.6 / uZoom);
    // El invertido se ve desde dentro (mirando al cielo), y eso invierte la imagen respecto al planeta:
    // se refleja el eje horizontal para que las letras no salgan en espejo.
    float phi = atan(p.y, uMode == 0 ? p.x : -p.x);
    float s = sin(th);
    float c = cos(th);
    vec3 dp = vec3(s * cos(phi), (uMode == 0 ? -c : c), s * sin(phi));
    d = rotY(rotX(dp, uPitch), uYaw);
  } else if (uMode == 2) {
    // Ojo de pez equidistante: el ángulo crece en proporción a la distancia al centro.
    float r = length(p);
    float th = r / uZoom * 1.75;
    float phi = atan(p.y, p.x);
    d = lookBasis() * vec3(sin(th) * cos(phi), sin(th) * sin(phi), cos(th));
    cover = 1.0 - smoothstep(uZoom - aa * 1.5, uZoom, r);
  } else if (uMode == 3) {
    // Globo: esfera vista desde fuera. n es la normal de la superficie en cada píxel.
    float R = 0.85 * uZoom;
    float rr = length(p);
    vec2 q = p / R;
    vec3 n = vec3(q, sqrt(max(0.0, 1.0 - dot(q, q))));
    d = lookBasis() * n;
    cover = 1.0 - smoothstep(R - aa * 1.5, R, rr);
    shade = mix(0.55, 1.0, pow(n.z, 0.45));                              // el borde se oscurece
    halo = (1.0 - cover) * exp(-max(rr - R, 0.0) * 14.0) * 0.4;           // brillo de atmósfera
  } else {
    // Plano: la foto entera, sin deformar.
    vec2 q = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    v = uPitch / PI + 0.5 + q.y / uZoom;
    u = uYaw / (2.0 * PI) + 0.5 + q.x / (2.0 * uZoom);
    cover = step(0.0, v) * step(v, 1.0);
    useDir = false;
  }

  if (useDir) {
    vec3 dn = normalize(d);
    u = atan(dn.x, dn.z) / (2.0 * PI) + 0.5;
    v = asin(clamp(dn.y, -1.0, 1.0)) / PI + 0.5;
  }

  // La costura de la foto (donde u da la vuelta) rompería la elección del mipmap y dibujaría una línea.
  // Se evita calculando las derivadas con la versión de u que no salta.
  float u1 = fract(u);
  float u2 = fract(u + 0.5) - 0.5;
  vec2 g1 = vec2(u1, v);
  vec2 g2 = vec2(u2, v);
  bool alt = fwidth(u2) < fwidth(u1);
  vec2 gx = alt ? dFdx(g2) : dFdx(g1);
  vec2 gy = alt ? dFdy(g2) : dFdy(g1);
  vec3 col = textureGrad(uTex, vec2(u1, clamp(v, 0.0, 1.0)), gx, gy).rgb;

  vec3 haloColor = vec3(0.55, 0.75, 1.0);
  outColor = vec4(mix(BG, col * shade, cover) + haloColor * halo, 1.0);
}
`
