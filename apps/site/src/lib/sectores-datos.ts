// Contenido real de las siete páginas de sector, extraído de reference/html/*.html.
// Los textos son literales del sitio en producción; no hay nada inventado.

export interface Sector {
  slug: string;            // ruta sin barras
  nombre: string;          // título visible
  entrada: string;         // etiqueta superior
  resumen: string | null;  // párrafo bajo el título (solo donde existe en el original)
  intro: string;           // bloque "Tu solución integral de mobiliario"
  introTitulo: string;
  imagen: string;
  categorias: string[];    // slugs de categoría de los que tomar productos
}

export const SECTORES_DATOS: Sector[] = [
  {
    slug: 'muebles-para-oficina',
    nombre: 'Muebles para oficina',
    entrada: 'Sector corporativo',
    resumen: 'Soluciones completas de mobiliario para crear espacios de trabajo corporativos productivos, funcionales y estéticos. Desde startups hasta grandes corporativos, tenemos la experiencia y los productos para transformar tu oficina.',
    introTitulo: 'Tu solución integral de mobiliario',
    intro: 'En Ofitodo, sabemos que la comodidad y la funcionalidad de tu espacio de trabajo son esenciales para el éxito de tu negocio. Nos especializamos en mobiliario para oficina que combina ergonomía, diseño y durabilidad. Desde escritorios ejecutivos hasta estaciones de trabajo colaborativas, ofrecemos soluciones integrales para crear espacios de trabajo que inspiran productividad y profesionalismo.',
    imagen: 'https://ofitodo.com/wp-content/uploads/2026/07/ChatGPT-Image-10-jul-2026_-15_01_03-768x512.webp',
    categorias: ['mobiliario-para-oficina', 'escritorios', 'estaciones-de-trabajo'],
  },
  {
    slug: 'muebles-para-bancos',
    nombre: 'Muebles para bancos',
    entrada: 'Sector financiero',
    resumen: 'Mobiliario especializado para instituciones financieras que cumple con los más altos estándares de seguridad, funcionalidad y profesionalismo. Diseñamos espacios que transmiten confianza y eficiencia.',
    introTitulo: 'Tu solución integral de muebles para bancos',
    intro: 'En Ofitodo, nos apasiona crear espacios de trabajo funcionales, cómodos y estéticos. Somos más que una simple tienda de muebles, somos tu aliado estratégico para equipar y optimizar tus espacios con mobiliario de la más alta calidad. En esta ocasión, queremos presentarte nuestra amplia gama de muebles para bancos, diseñados para satisfacer las necesidades de todo tipo de entornos.',
    imagen: 'https://ofitodo.com/wp-content/uploads/2026/07/ChatGPT-Image-30-jul-2026_-13_47_48-768x576.webp',
    categorias: ['muebles-para-bancos', 'recepcion', 'bancas-de-espera'],
  },
  {
    slug: 'muebles-para-escuelas',
    nombre: 'Muebles para escuelas',
    entrada: 'Sector educativo',
    resumen: null,
    introTitulo: 'Tu solución integral de mobiliario',
    intro: 'En Ofitodo creemos que un espacio educativo bien equipado es fundamental para el aprendizaje. Nuestro mobiliario escolar está diseñado pensando en la comodidad, seguridad y ergonomía de estudiantes y profesores. Desde pupitres y bancas hasta mobiliario para bibliotecas y laboratorios, ofrecemos soluciones duraderas y funcionales que crean entornos educativos inspiradores.',
    imagen: 'https://ofitodo.com/wp-content/uploads/2026/06/ChatGPT-Image-15-jun-2026_-09_47_36-768x576.webp',
    categorias: ['mobiliario-escolar', 'pupitres', 'libreros'],
  },
  {
    slug: 'muebles-para-consultorios',
    nombre: 'Muebles para consultorios',
    entrada: 'Sector salud',
    resumen: null,
    introTitulo: 'Tu solución integral de mobiliario',
    intro: 'Ofitodo ofrece soluciones de mobiliario para consultorios médicos que combinan funcionalidad, higiene y confort. Entendemos que tu consultorio debe ser un espacio que inspire confianza en tus pacientes. Por eso, ofrecemos escritorios médicos, sillas ergonómicas, áreas de espera confortables y soluciones de almacenamiento diseñadas específicamente para el sector salud, con materiales de fácil limpieza y desinfección.',
    imagen: 'https://ofitodo.com/wp-content/uploads/2025/12/Consultorio.webp',
    categorias: ['mobiliario-para-consultorios-medicos', 'salas-de-espera', 'credenzas'],
  },
  {
    slug: 'muebles-para-hospital',
    nombre: 'Muebles para hospital',
    entrada: 'Sector salud',
    resumen: null,
    introTitulo: 'Tu solución integral de mobiliario',
    intro: 'En Ofitodo comprendemos las exigencias del sector hospitalario. Nuestro mobiliario para hospitales cumple con las más estrictas normativas sanitarias, ofreciendo soluciones para áreas administrativas, estaciones de enfermería, salas de espera y espacios clínicos. Utilizamos materiales resistentes y de fácil desinfección, garantizando durabilidad y cumplimiento normativo en cada pieza.',
    imagen: 'https://ofitodo.com/wp-content/uploads/2025/12/Recepcion.webp',
    categorias: ['muebles-para-hospital', 'salas-de-espera', 'bancas-de-espera'],
  },
  {
    slug: 'muebles-para-industria',
    nombre: 'Muebles para industria',
    entrada: 'Sector industrial',
    resumen: null,
    introTitulo: 'Tu solución integral de mobiliario',
    intro: 'Ofitodo es tu proveedor de confianza para mobiliario industrial en Aguascalientes. Nuestros productos están diseñados para resistir las condiciones más exigentes del entorno industrial. Desde mesas de trabajo robustas hasta lockers metálicos y sistemas de almacenamiento, ofrecemos soluciones duraderas que optimizan la productividad y garantizan la seguridad de tu personal.',
    imagen: 'https://ofitodo.com/wp-content/uploads/2025/12/Estaciones-de-trabajo-industrial.webp',
    categorias: ['mobiliario-industrial', 'lockers-y-vestidores', 'sillas-industriales-ofitodo'],
  },
  {
    slug: 'muebles-para-restaurante',
    nombre: 'Muebles para restaurante',
    entrada: 'Sector gastronómico',
    resumen: null,
    introTitulo: 'Tu solución integral de mobiliario',
    intro: 'En Ofitodo te ayudamos a crear espacios gastronómicos atractivos y funcionales. Nuestro mobiliario para restaurantes combina diseño, confort y durabilidad. Desde mesas y sillas para comensales hasta mobiliario para barra y terraza, ofrecemos soluciones versátiles que se adaptan a diferentes estilos y necesidades, con materiales resistentes y de fácil mantenimiento.',
    imagen: 'https://ofitodo.com/wp-content/uploads/2026/06/ChatGPT-Image-15-jun-2026_-09_45_47-768x576.webp',
    categorias: ['muebles-para-restaurantes', 'restaurantes', 'sillas-restaurantes'],
  },
];

// Bloque "¿Por qué elegir OFITODO?" — literal del sitio original.
export const POR_QUE = {
  titulo: '¿Por qué elegir Ofitodo?',
  puntos: [
    { titulo: 'Experiencia comprobada', texto: 'Años de experiencia equipando espacios.' },
    { titulo: 'Calidad garantizada', texto: 'Mobiliario de alta calidad con garantía y soporte.' },
    { titulo: 'Asesoría personalizada', texto: 'Expertos que te ayudan a elegir las mejores soluciones.' },
    { titulo: 'Entrega e instalación', texto: 'Servicio completo de entrega e instalación profesional.' },
  ],
};

export const CIERRE_SECTOR = {
  titulo: '¿Listo para transformar tu espacio de trabajo?',
  texto: 'Contacta con nuestros expertos en mobiliario para oficina y recibe una cotización personalizada sin compromiso. Estamos aquí para ayudarte a crear el espacio perfecto.',
};
