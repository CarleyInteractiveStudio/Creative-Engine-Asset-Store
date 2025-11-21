-- Este script prepara la tabla 'products' para la búsqueda de texto completo (Full-Text Search).
-- Por favor, ejecuta este código en el Editor SQL de tu panel de Supabase.

-- Paso 1: Añadir una columna 'fts' (Full-Text Search) a la tabla de productos.
-- Esta columna almacenará los vectores de texto para una búsqueda eficiente.
ALTER TABLE public.products
ADD COLUMN fts tsvector;

-- Paso 2: Crear una función que actualice la columna 'fts' automáticamente.
-- Esta función combina el nombre y la descripción del producto, asignando más peso (importancia) al nombre.
CREATE OR REPLACE FUNCTION public.update_product_fts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fts :=
    setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Paso 3: Crear un "trigger" (disparador) que ejecute la función anterior.
-- Se activará automáticamente cada vez que se inserte o actualice un producto.
CREATE TRIGGER product_fts_update
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_product_fts();

-- Paso 4: Crear un índice en la nueva columna 'fts'.
-- Esto acelera enormemente las búsquedas de texto completo.
CREATE INDEX product_fts_idx ON public.products USING GIN (fts);

-- Paso 5: Actualizar todos los productos existentes.
-- Este comando llenará la columna 'fts' para todos los productos que ya están en tu base de datos.
-- Es importante ejecutar esto para que los productos antiguos aparezcan en las búsquedas.
UPDATE public.products SET id = id;

-- ¡Listo! La base de datos ya está preparada para la búsqueda.
