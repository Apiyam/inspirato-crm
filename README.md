# Inspirato CRM

CRM para gestión de conversaciones WhatsApp, contactos, asistente IA y configuración del bot.

## Stack

- Next.js 15
- MUI Joy
- Supabase (auth + base de datos)
- OpenAI (análisis de conversaciones)
- N8N (webhook WhatsApp)

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000/clientes/login](http://localhost:3000/clientes/login).

Copia `.env.example` a `.env.local` y configura las variables.

## Migraciones

Ejecuta los SQL en `supabase/migrations/` en tu proyecto Supabase.
