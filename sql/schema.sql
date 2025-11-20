-- 1. Tabla para Calificaciones (Estrellas)
-- Almacena la calificación de 1 a 5 que un usuario le da a un producto.
CREATE TABLE public.ratings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating smallint NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT ratings_pkey PRIMARY KEY (id),
    CONSTRAINT ratings_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT ratings_unique_user_product UNIQUE (user_id, product_id)
);

-- 2. Tabla para Comentarios
-- Almacena los comentarios que los usuarios dejan en los productos.
CREATE TABLE public.comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    comment_type text NOT NULL, -- 'positive' o 'negative'
    created_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT comments_pkey PRIMARY KEY (id),
    CONSTRAINT comments_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT comments_comment_type_check CHECK (comment_type IN ('positive', 'negative'))
);

-- 3. Tabla para Votos en Comentarios
-- Almacena los votos (pulgar arriba/abajo, apoyo) que reciben los comentarios.
CREATE TABLE public.comment_votes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    comment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    vote_type text NOT NULL, -- 'upvote', 'downvote', 'support'
    created_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT comment_votes_pkey PRIMARY KEY (id),
    CONSTRAINT comment_votes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    CONSTRAINT comment_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT comment_votes_vote_type_check CHECK (vote_type IN ('upvote', 'downvote', 'support')),
    CONSTRAINT comment_votes_unique_user_comment UNIQUE (user_id, comment_id)
);


-- 4. Función Auxiliar de Seguridad
-- Esta función comprueba si el usuario autenticado actual es propietario de un producto específico.
-- Es crucial para las políticas de seguridad de RLS (Row Level Security).
CREATE OR REPLACE FUNCTION public.user_owns_product(product_id_to_check uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_owned_assets
    WHERE user_id = auth.uid() AND product_id = product_id_to_check
  );
$function$;


-- 5. Políticas de Seguridad (RLS) para la tabla 'ratings'
-- Habilitar RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
-- Permitir a todos leer las calificaciones
CREATE POLICY "Allow public read access to ratings" ON public.ratings FOR SELECT USING (true);
-- Permitir a los usuarios insertar una calificación SOLO si han comprado el producto
CREATE POLICY "Allow users to insert their own rating if they own the product" ON public.ratings FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  public.user_owns_product(product_id)
);
-- Permitir a los usuarios actualizar SU PROPIA calificación
CREATE POLICY "Allow users to update their own rating" ON public.ratings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 6. Políticas de Seguridad (RLS) para la tabla 'comments'
-- Habilitar RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
-- Permitir a todos leer los comentarios
CREATE POLICY "Allow public read access to comments" ON public.comments FOR SELECT USING (true);
-- Permitir a los usuarios insertar un comentario SOLO si han comprado el producto
CREATE POLICY "Allow users to insert their own comment if they own the product" ON public.comments FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  public.user_owns_product(product_id)
);
-- Permitir a los usuarios actualizar y borrar SUS PROPIOS comentarios
CREATE POLICY "Allow users to update/delete their own comments" ON public.comments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 7. Políticas de Seguridad (RLS) para la tabla 'comment_votes'
-- Habilitar RLS
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;
-- Permitir a todos leer los votos
CREATE POLICY "Allow public read access to comment votes" ON public.comment_votes FOR SELECT USING (true);
-- Permitir a los usuarios autenticados insertar/actualizar/borrar sus propios votos
CREATE POLICY "Allow authenticated users to manage their own votes" ON public.comment_votes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. Vista para Productos con Calificaciones Promedio
-- Esta vista simplifica las consultas al pre-calcular la calificación promedio y el número de calificaciones para cada producto.
CREATE OR REPLACE VIEW public.products_with_ratings AS
SELECT
    p.*,
    COALESCE(avg_ratings.avg_rating, 0) as average_rating,
    COALESCE(avg_ratings.rating_count, 0) as rating_count
FROM
    public.products p
LEFT JOIN (
    SELECT
        product_id,
        AVG(rating) as avg_rating,
        COUNT(id) as rating_count
    FROM
        public.ratings
    GROUP BY
        product_id
) as avg_ratings ON p.id = avg_ratings.product_id;
