This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Cadenas de carga (FART)

Antes de usar el selector Ripley/Oechsle, ejecutar `supabase/migrations/20261020_cadenas.sql` en el SQL Editor del proyecto Supabase. La aplicación necesita esta columna para guardar la cadena; las claves de API disponibles en `.env.local` no permiten modificar la estructura SQL.

La migración conserva los importes y asigna el historial existente a Ripley, la operación anterior. Si el primer viaje de Oechsle ya estaba registrado, editarlo después para cambiar su cadena.

FART sigue siendo la contraparte de cobro. Los viajes requieren Ripley u Oechsle. Los depósitos y saldos anteriores también admiten General FART: afectan la cuenta total una sola vez y no se reparten automáticamente entre cadenas. Si hay movimientos generales, el saldo de una cadena se muestra antes de esos abonos, con una aclaración. Para obtener su deuda exacta, asignar el depósito a la cadena que corresponda; un depósito que cubra ambas debe registrarse en dos importes cuya suma sea el depósito recibido.

## PWA en iPhone

Publicar por HTTPS. En el iPhone, abrir la URL en Safari → Compartir → Agregar a Inicio → activar Abrir como app web si aparece → Agregar. El acceso se llama TransMedina y usa el camión con la R de Ripley. En el menú lateral también hay instrucciones y una acción para actualizar la vista.

`src/app/manifest.ts` configura la instalación y `src/app/layout.tsx` los metadatos de Apple y el viewport. Los iconos están en `public/pwa/`. El service worker (`public/sw.js`) solo se registra en producción y en un contexto seguro (HTTPS o localhost).

Los viajes, sesiones, API, PDF y saldos no se guardan en la caché del service worker. Para consultarlos y hacer cambios se necesita conexión. Si falla una navegación sin internet, se muestra una pantalla estática para reintentar; la página abierta también indica la pérdida de conexión. Incrementar `transmedina-static-v1` al cambiar los recursos precargados.

## Desarrollo

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
