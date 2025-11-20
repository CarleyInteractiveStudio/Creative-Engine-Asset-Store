-- Habilitar Row Level Security (RLS) en la tabla 'profiles' si aún no está habilitado.
-- Si ya está habilitado, este comando no hará nada.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Crear una nueva política de seguridad para permitir el acceso de lectura a TODOS los perfiles.
-- Esto es necesario para que la consulta de comentarios pueda obtener el 'username' de cada autor.
-- No te preocupes, solo permite LEER datos. Nadie podrá modificar los perfiles de otros.
CREATE POLICY "Allow public read access to profiles"
ON public.profiles
FOR SELECT
USING (true);
