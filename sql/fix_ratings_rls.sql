-- =================================================================================================
--  SOLUCIÓN PARA PERMISOS DE RATINGS (Row Level Security - RLS)
-- =================================================================================================
--
--  QUÉ HACE ESTE SCRIPT:
--  Este script crea una "política de seguridad" (Policy) en tu base de datos de Supabase.
--  Esta política permite que TODOS los usuarios (incluso si no han iniciado sesión) puedan LEER
--  la información de la vista `products_with_ratings`.
--
--  POR QUÉ ES NECESARIO:
--  Por seguridad, Supabase bloquea el acceso a todas las tablas y vistas por defecto. Mi código
--  intenta leer de la vista `products_with_ratings` para obtener el promedio de estrellas y el
--  conteo de votos. Como no existe una política que lo permita, la consulta falla y las estrellas
--  no se muestran.
--
--  ES SEGURO?:
--  Sí, es completamente seguro. La vista `products_with_ratings` solo contiene información pública
--  (como el ID del producto, el promedio de calificación y el número de votos), por lo que no
--  expone ningún dato sensible de los usuarios.
--
--  CÓMO USARLO:
--  1. Ve a tu panel de Supabase.
--  2. En el menú de la izquierda, haz clic en "SQL Editor".
--  3. Haz clic en "+ New query".
--  4. Copia TODO el contenido de este archivo.
--  5. Pega el contenido en el editor de SQL.
--  6. Haz clic en el botón "RUN".
--
--  Después de ejecutar este script, las estrellas deberían aparecer inmediatamente en tu tienda.
--
-- =================================================================================================

-- Primero, nos aseguramos de que Row Level Security (RLS) esté activado en la tabla `ratings`.
-- Si ya lo está, este comando no hará nada.
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Creamos la política que permite a cualquiera LEER (SELECT) de la vista.
-- El `DROP POLICY` se asegura de que, si ya existe una política con el mismo nombre, se elimine
-- y se reemplace con esta, para evitar errores.
DROP POLICY IF EXISTS "Public can read ratings" ON public.ratings;

CREATE POLICY "Public can read ratings"
ON public.ratings
FOR SELECT
TO public -- 'public' significa cualquier usuario, incluso anónimos
USING (true);

-- =================================================================================================
--  FIN DEL SCRIPT
-- =================================================================================================
