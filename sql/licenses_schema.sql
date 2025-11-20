-- 1. Añadir columnas a la tabla 'products' para manejar las licencias
ALTER TABLE public.products
ADD COLUMN license_type TEXT NOT NULL DEFAULT 'standard_paid',
ADD COLUMN custom_license_seller_rights TEXT,
ADD COLUMN custom_license_buyer_rights TEXT,
ADD COLUMN license_file_path TEXT; -- Para almacenar la ruta al archivo licencia.txt

-- 2. Crear una tabla para gestionar las ventas de productos exclusivos y su borrado programado
CREATE TABLE public.exclusive_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES auth.users(id),
    sold_at TIMESTAMPTZ DEFAULT NOW(),
    delete_scheduled_for TIMESTAMPTZ NOT NULL
);

-- 3. Añadir políticas de seguridad para la nueva tabla 'exclusive_sales'
ALTER TABLE public.exclusive_sales ENABLE ROW LEVEL SECURITY;

-- Los administradores (usando service_role_key) pueden hacer todo
CREATE POLICY "Allow admin full access"
ON public.exclusive_sales
FOR ALL
USING (true)
WITH CHECK (true);

-- El comprador puede ver su propia compra
CREATE POLICY "Allow buyer to see their own exclusive purchases"
ON public.exclusive_sales
FOR SELECT
USING (auth.uid() = buyer_id);
