// Esquema operativo (ADR-003): solo lo que este sitio usa de verdad.
// Toda tabla migrada conserva legacy_id (ID de WordPress) para trazabilidad.
import { pgTable, serial, integer, text, varchar, boolean, timestamp, numeric, jsonb, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  legacyId: integer('legacy_id'),
  login: varchar('login', { length: 60 }).notNull().unique(),
  email: varchar('email', { length: 190 }).notNull().unique(),
  displayName: varchar('display_name', { length: 190 }).notNull(),
  rol: varchar('rol', { length: 30 }).notNull().default('administrator'),
  passwordHash: text('password_hash'),            // argon2id tras primer login
  legacyHash: text('legacy_hash'),                // phpass $P$ o bcrypt $wp$ del original
  registrado: timestamp('registrado', { withTimezone: true }).notNull(),
});

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  creada: timestamp('creada', { withTimezone: true }).notNull().defaultNow(),
  expira: timestamp('expira', { withTimezone: true }).notNull(),
}, (t) => [index('sessions_user_idx').on(t.userId)]);

export const productCategories = pgTable('product_categories', {
  id: serial('id').primaryKey(),
  legacyId: integer('legacy_id'),
  slug: varchar('slug', { length: 190 }).notNull().unique(),
  nombre: varchar('nombre', { length: 190 }).notNull(),
  descripcionHtml: text('descripcion_html'),      // contenido Enhanced Category Pages consolidado
  parentId: integer('parent_id'),
  orden: integer('orden').notNull().default(0),
  seo: jsonb('seo'),
});

export const productBrands = pgTable('product_brands', {
  id: serial('id').primaryKey(),
  legacyId: integer('legacy_id'),
  slug: varchar('slug', { length: 190 }).notNull().unique(),
  nombre: varchar('nombre', { length: 190 }).notNull(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  legacyId: integer('legacy_id'),
  slug: varchar('slug', { length: 190 }).notNull().unique(),
  nombre: varchar('nombre', { length: 300 }).notNull(),
  sku: varchar('sku', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull().default('publish'),
  descripcionHtml: text('descripcion_html'),
  descripcionCorta: text('descripcion_corta'),
  precio: numeric('precio', { precision: 12, scale: 2 }),          // null = CTA de cotización (así opera el original)
  precioRegular: numeric('precio_regular', { precision: 12, scale: 2 }),
  precioOferta: numeric('precio_oferta', { precision: 12, scale: 2 }),
  stockStatus: varchar('stock_status', { length: 20 }).notNull().default('instock'),
  imagenPrincipal: text('imagen_principal'),
  galeria: jsonb('galeria').$type<string[]>(),
  atributos: jsonb('atributos'),
  etiquetas: jsonb('etiquetas').$type<string[]>(),
  relacionados: jsonb('relacionados').$type<number[]>(),
  seo: jsonb('seo'),
  fecha: timestamp('fecha', { withTimezone: true }),
  modificado: timestamp('modificado', { withTimezone: true }),
}, (t) => [index('products_status_idx').on(t.status)]);

export const productCategoryLinks = pgTable('product_category_links', {
  productId: integer('product_id').notNull().references(() => products.id),
  categoryId: integer('category_id').notNull().references(() => productCategories.id),
}, (t) => [index('pcl_prod_idx').on(t.productId), index('pcl_cat_idx').on(t.categoryId)]);

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  legacyId: integer('legacy_id'),
  numero: integer('numero').notNull().unique(),   // continúa desde el último real
  estado: varchar('estado', { length: 30 }).notNull(), // pendiente | confirmado | entregado | cancelado (contra entrega)
  moneda: varchar('moneda', { length: 3 }).notNull().default('MXN'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  clienteNombre: varchar('cliente_nombre', { length: 190 }).notNull(),
  clienteEmail: varchar('cliente_email', { length: 190 }).notNull(),
  clienteTelefono: varchar('cliente_telefono', { length: 40 }),
  direccion: jsonb('direccion'),                  // mismos campos billing_* del checkout original
  notasCliente: text('notas_cliente'),
  creado: timestamp('creado', { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id),
  productId: integer('product_id').references(() => products.id),
  nombre: varchar('nombre', { length: 300 }).notNull(),
  cantidad: integer('cantidad').notNull(),
  precioUnitario: numeric('precio_unitario', { precision: 12, scale: 2 }).notNull(),
  totalLinea: numeric('total_linea', { precision: 12, scale: 2 }).notNull(),
}, (t) => [index('order_items_order_idx').on(t.orderId)]);

export const orderNotes = pgTable('order_notes', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id),
  nota: text('nota').notNull(),
  autor: varchar('autor', { length: 100 }),
  creada: timestamp('creada', { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  legacyId: integer('legacy_id'),
  productLegacyId: integer('product_legacy_id'),
  autor: varchar('autor', { length: 190 }),
  email: varchar('email', { length: 190 }),
  contenido: text('contenido'),
  rating: integer('rating'),
  aprobada: boolean('aprobada').notNull().default(false), // las 170 del original están sin aprobar
  fecha: timestamp('fecha', { withTimezone: true }),
});

export const formSubmissions = pgTable('form_submissions', {
  id: serial('id').primaryKey(),
  legacyId: integer('legacy_id'),
  formulario: varchar('formulario', { length: 100 }).notNull(), // contact-me | formulario | catalogo
  datos: jsonb('datos').notNull(),
  paginaOrigen: text('pagina_origen'),
  creado: timestamp('creado', { withTimezone: true }).notNull().defaultNow(),
  leido: boolean('leido').notNull().default(false),
});

export const emailLog = pgTable('email_log', {
  id: serial('id').primaryKey(),
  para: varchar('para', { length: 190 }).notNull(),
  asunto: text('asunto').notNull(),
  disparador: varchar('disparador', { length: 60 }).notNull(),
  estado: varchar('estado', { length: 20 }).notNull(),
  creado: timestamp('creado', { withTimezone: true }).notNull().defaultNow(),
});

export const contentVersions = pgTable('content_versions', {
  id: serial('id').primaryKey(),
  commitSha: varchar('commit_sha', { length: 40 }).notNull(),
  etiqueta: text('etiqueta').notNull(),           // "26 ago, 14:32 — Ana cambió Foto de portada de Inicio"
  autor: varchar('autor', { length: 100 }).notNull(),
  creado: timestamp('creado', { withTimezone: true }).notNull().defaultNow(),
});

export const publishJobs = pgTable('publish_jobs', {
  id: serial('id').primaryKey(),
  estado: varchar('estado', { length: 20 }).notNull().default('encolado'), // encolado | construyendo | publicado | fallido
  commitSha: varchar('commit_sha', { length: 40 }),
  detalle: text('detalle'),
  creado: timestamp('creado', { withTimezone: true }).notNull().defaultNow(),
  terminado: timestamp('terminado', { withTimezone: true }),
});

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  accion: varchar('accion', { length: 60 }).notNull(),
  entidad: varchar('entidad', { length: 60 }).notNull(),
  entidadId: varchar('entidad_id', { length: 60 }),
  detalle: jsonb('detalle'),
  creado: timestamp('creado', { withTimezone: true }).notNull().defaultNow(),
});
