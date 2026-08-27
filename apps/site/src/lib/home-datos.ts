// Datos reales de la portada, tomados del sitio actual (nada inventado).
export const HERO = {
  titulo: 'Mobiliario para oficina',
  entrada: 'Fabricantes en Aguascalientes',
  texto: 'Experimenta la combinación perfecta de calidad, confort y diseño. Creamos espacios de trabajo funcionales y estéticos en Aguascalientes y todo México, inspirando productividad y bienestar.',
  ctaPrimario: { texto: 'Cotizar ahora', href: 'https://wa.me/524493419403' },
  ctaSecundario: { texto: 'Explorar catálogo', href: '/descargar-catalogo/' },
  imagen: 'https://ofitodo.com/wp-content/uploads/2026/01/studio-arrangement-work-1-1536x838.webp',
};

export const INTRO = {
  titulo: 'Mesas, sillas, estaciones de trabajo y más equipo para oficina',
  texto: 'Conoce todos nuestros servicios de mobiliario para oficina en Aguascalientes y México. Ofrecemos muebles modernos, ergonómicos y personalizados: desde escritorios y sillas hasta soluciones completas de almacenamiento y decoración.',
};

export interface Cat { nombre: string; ruta: string; img: string; n: number }

export const PERSONALIZADO = {
  titulo: 'Mobiliario personalizado para tu empresa',
  texto: 'En Ofitodo entendemos que cada empresa es única y tiene necesidades específicas. Por eso ofrecemos un servicio de diseño y fabricación de mobiliario para oficina completamente personalizado.',
  puntos: [
    'Diseños exclusivos adaptados a tu marca',
    'Materiales de alta calidad y durabilidad',
    'Asesoría profesional en cada etapa del proyecto',
    'Instalación profesional incluida',
  ],
  cta: { texto: 'Solicitar diseño personalizado', href: 'https://wa.me/524493419403' },
  imagen: 'https://ofitodo.com/wp-content/uploads/2026/01/studio-arrangement-work-3-1536x838.webp',
};

export const SECTORES = [
  { nombre: 'Oficinas', href: '/muebles-para-oficina/', img: 'https://ofitodo.com/wp-content/uploads/2026/07/ChatGPT-Image-10-jul-2026_-15_01_03-768x512.webp' },
  { nombre: 'Bancos', href: '/muebles-para-bancos/', img: 'https://ofitodo.com/wp-content/uploads/2026/07/ChatGPT-Image-30-jul-2026_-13_47_48-768x576.webp' },
  { nombre: 'Escuelas', href: '/muebles-para-escuelas/', img: 'https://ofitodo.com/wp-content/uploads/2026/06/ChatGPT-Image-15-jun-2026_-09_47_36-768x576.webp' },
  { nombre: 'Consultorios', href: '/muebles-para-consultorios/', img: 'https://ofitodo.com/wp-content/uploads/2026/06/ChatGPT-Image-1-jun-2026_-11_26_42.png-768x576.webp' },
  { nombre: 'Hospitales', href: '/muebles-para-hospital/', img: 'https://ofitodo.com/wp-content/uploads/2025/12/Consultorio-768x512.webp' },
  { nombre: 'Industria', href: '/muebles-para-industria/', img: 'https://ofitodo.com/wp-content/uploads/2025/12/lockers-768x1152.webp' },
  { nombre: 'Restaurantes', href: '/muebles-para-restaurante/', img: 'https://ofitodo.com/wp-content/uploads/2025/12/exhibidores-melamina-768x768.webp' },
];

export const PROCESO = [
  { n: '01', t: 'Asesoría personalizada', d: 'Escuchamos tus necesidades y el uso real de tu espacio.' },
  { n: '02', t: 'Selección de mobiliario', d: 'Te proponemos las piezas que mejor resuelven tu proyecto.' },
  { n: '03', t: 'Cotización detallada', d: 'Presupuesto claro, sin sorpresas ni compromisos.' },
  { n: '04', t: 'Toma de medidas', d: 'Visitamos tu espacio para que todo encaje a la perfección.' },
  { n: '05', t: 'Fabricación y preparación', d: 'Producimos con materiales de alta calidad.' },
  { n: '06', t: 'Entrega y armado', d: 'Llevamos e instalamos el mobiliario en tu sitio.' },
  { n: '07', t: 'Garantía y acompañamiento', d: 'Seguimos contigo después de la entrega.' },
];

export const CLIENTES = [
  { alt: 'Sensata', src: 'https://ofitodo.com/wp-content/uploads/2023/10/Diseno_sin_titulo__18_-removebg-preview.png' },
  { alt: 'COMPAS', src: 'https://ofitodo.com/wp-content/uploads/2023/10/Diseno_sin_titulo__9_-removebg-preview.png' },
  { alt: 'Yorozu', src: 'https://ofitodo.com/wp-content/uploads/2023/10/Diseno_sin_titulo__17_-removebg-preview.webp' },
  { alt: 'DDF México', src: 'https://ofitodo.com/wp-content/uploads/2023/10/Diseno_sin_titulo__16_-removebg-preview.webp' },
  { alt: 'TENNECO', src: 'https://ofitodo.com/wp-content/uploads/2023/10/Diseno_sin_titulo__15_-removebg-preview.webp' },
  { alt: 'Nissan', src: 'https://ofitodo.com/wp-content/uploads/2023/10/Diseno_sin_titulo__14_-removebg-preview.webp' },
  { alt: 'Sumitomo', src: 'https://ofitodo.com/wp-content/uploads/2023/10/Diseno_sin_titulo__13_-removebg-preview.png' },
];

export const CATALOGOS = [
  { t: 'Melamina', d: 'Catálogo completo de muebles en melamina', href: '/descargar-catalogo/', img: 'https://ofitodo.com/wp-content/uploads/2025/12/imagen_2024-06-21_115558353-1-e1764700495282-600x400.webp' },
  { t: 'Conectividad', d: 'Sistemas de conectividad para oficinas', href: '/descargar-catalogo/', img: 'https://ofitodo.com/wp-content/uploads/2025/12/imagen_2024-06-21_120108510-500x500-1-e1764700557215-500x500.webp' },
  { t: 'Exhibidores', d: 'Soluciones en exhibidores comerciales', href: '/descargar-catalogo/', img: 'https://ofitodo.com/wp-content/uploads/2025/12/imagen_2024-06-21_120201876-1-500x500-1-e1764700581963-500x500.webp' },
];

export const CIERRE = {
  titulo: '¿Listo para transformar tu espacio de trabajo?',
  texto: 'Contacta con nuestros expertos en mobiliario para oficina y recibe una cotización personalizada sin compromiso. Estamos aquí para ayudarte a crear el espacio perfecto.',
};
