# Viajes externos

Acceso: solo el administrador actual de NextAuth. Ruta: `/externos`.
El selector TransMedina permite volver a FART. Las APIs existentes siguen
consultando `viajes`; no incluyen las tablas `externos_*`.

## Activación de la base de datos

1. Verificar el proyecto Supabase configurado en `.env.local` y contar con un
   respaldo antes del despliegue.
2. Ejecutar `supabase/migrations/20261106_externos.sql` una sola vez, desde el SQL
   Editor del proyecto o el flujo de migraciones habitual. Usa una transacción;
   no altera los registros FART. Requiere acceso SQL, no solo una service key.
3. Ejecutar `node scripts/check-externos-db.cjs`: las tres tablas nuevas deben
   estar disponibles y el bucket debe indicar `OK: private`.
4. Abrir `/externos` con el administrador y probar creación, edición, abono,
   anulación y carga/lectura de documentos. Probar también en móvil.

Si falla la migración, la transacción revierte sus cambios. Para retirar la
funcionalidad después de usarla, volver a la versión anterior de la aplicación
y conservar tablas/bucket; no borrar datos ni documentos para hacer rollback.

## Reglas

### IGV con flete ya pagado

Aplicar una sola vez `supabase/migrations/20261106_externos_igv.sql`, después de
la migración inicial. No volver a ejecutar la migración inicial.

- **IGV incluido:** `monto` es el total ya pagado, con IGV. Adicional pendiente: 0.
- **+ IGV:** `monto` es el flete sin IGV ya pagado. Se cobra únicamente el 18 %
  adicional, redondeado a dos decimales, menos los abonos vigentes de IGV.
- Ejemplo: flete de S/ 7,000 + IGV → S/ 1,260 por cobrar; abono de S/ 260 → S/ 1,000.
- El resumen muestra IGV pendiente, número de viajes pendientes e IGV cobrado.
  Cancelados se excluyen. Los viajes anteriores siguen en el pendiente total,
  pero no se incluyen en los indicadores de IGV hasta clasificarlos.
- La migración mantiene los registros existentes en modalidad `total`; no marca
  fletes pagados automáticamente ni modifica abonos. Cambiar modalidad exige
  que no haya abonos vigentes, evitando reinterpretar abonos de flete como IGV.
- No se crean abonos ficticios para el flete pagado. La modalidad registra esa
  condición; los abonos nuevos en `adicional` corresponden únicamente al IGV.
- La detracción sigue siendo informativa y no reduce automáticamente el IGV.

### Reglas generales

- Clientes escritos en cada viaje con sugerencias de nombres existentes. No hay
  catálogo independiente de clientes ni permisos delegados en esta versión.
- Importe positivo en soles; abonos positivos asignados a un único viaje.
- Saldo = importe por cobrar según modalidad menos abonos vigentes, en céntimos.
- La base bloquea sobrepagos concurrentes y reducciones por debajo de lo cobrado.
- Los abonos no se editan ni borran: se anulan con motivo y se registra uno nuevo.
  El identificador de envío evita duplicar un abono al reintentar la solicitud.
- Un viaje con abonos vigentes no puede cancelarse. Cancelados se excluyen del
  resumen y del calendario; siguen consultables en el filtro de cancelados.
- Detracción informativa opcional; no descuenta del saldo. Su tratamiento de
  liquidación queda pendiente de la definición del propietario.
- Documentos privados en Supabase Storage (PDF/JPG/PNG, 10 MB). Acceso a través
  de la API con sesión de administrador. No se crean enlaces públicos de Drive.
- Las tablas no conceden acceso a anon/authenticated. La API verifica la
  identidad NextAuth antes de usar el cliente service role aislado de cookies.
- Los totales son de todos los viajes activos externos; filtros y calendario
  afectan al listado, no al resumen general.

## Validación

### Consulta de RUC

Proveedor integrado: Decolecta (antes apis.net.pe).
Documentación: https://decolecta.gitbook.io/docs/servicios/integrations

1. Crear la cuenta del propietario en https://decolecta.com/ y obtener su token.
   La oferta gratuita tiene límites; revisar el plan vigente al registrarse.
2. Guardar `DECOLECTA_API_TOKEN=tu_token` en `.env.local` y en las variables del
   servidor de producción. Nunca usar un prefijo `NEXT_PUBLIC_` para esta clave.
3. Reiniciar el servidor de desarrollo después de configurar la variable.
4. Ejecutar `supabase/migrations/20261106_externos_ruc.sql` en Supabase.

El formulario consulta al completar 11 dígitos (500 ms de espera), permite
reintentar con «Consultar RUC» y mantiene editable la razón social. Al cambiar
el RUC se limpia el nombre para evitar asociarlo a otra empresa. Las respuestas
de solicitudes anteriores se descartan. La consulta solo autocompleta: hay que
guardar el viaje para persistir el nombre y el RUC.

La API exige sesión de administrador, conserva el token en el servidor y usa
timeout de 8 segundos. Caché de 6 horas y máximo de 20 consultas/minuto por
proceso; no es un límite distribuido entre instancias. Devuelve solo RUC y nombre.
Si falta el token, falla el servicio o se agota la cuota, permite ingreso manual.
La migración copia al campo RUC los clientes que eran únicamente 11 dígitos;
no sustituye sus nombres por datos no verificados.

`node scripts/test-ruc.cjs` prueba el adaptador con respuestas simuladas; una
consulta real requiere el token del propietario. Las pruebas de acceso incluyen
la nueva ruta `/api/externos/ruc`.

`node scripts/test-externos.cjs` verifica saldos, anulaciones, redondeos y entradas.
Ejecutar también TypeScript, ESLint sobre los archivos nuevos y `next build`.
Comprobar que sin sesión las APIs devuelven 401 (incluyendo documentos), que los
enlaces FART/secretaría no acceden al módulo y que los roles anon/authenticated
no pueden consultar tablas ni el bucket. La comprobación local del código no
sustituye estas pruebas de integración después de aplicar la migración.
# Estado de cobro

Ejecutar `supabase/migrations/20261108_externos_pago_completo.sql` para habilitar **Debe IGV / Pagó completo** al crear o editar viajes con IGV adicional. Los registros existentes conservan sus saldos hasta ser editados.

`pago_completo` confirma que no queda saldo pendiente, sin crear abonos ficticios ni modificar documentos o detracciones. El resumen de IGV cobrado sigue mostrando únicamente los abonos registrados. Para reabrir el saldo, seleccionar **Debe IGV**; se descuentan los abonos vigentes. La base de datos bloquea nuevos abonos mientras el viaje esté marcado como pagado completo.

