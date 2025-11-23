-- VISTA PARA OBTENER RATINGS Y CONTEOS POR PRODUCTO (CON IMAGEN)
CREATE OR REPLACE VIEW products_with_ratings AS
SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.status,
    p.category_id,
    p.fts,
    COALESCE(SUM(r.rating), 0) AS total_stars,
    (
        SELECT image_url
        FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY created_at ASC
        LIMIT 1
    ) AS image_url
FROM
    products p
LEFT JOIN
    ratings r ON p.id = r.product_id
GROUP BY
    p.id;

-- VISTA PARA OBTENER DETALLES DE COMENTARIOS (INCLUYENDO VOTOS)
-- Corregido para eliminar la columna 'rating' que no existe en 'comments'
CREATE OR REPLACE VIEW comments_with_details AS
SELECT
    c.id,
    c.product_id,
    c.user_id,
    c.content,
    c.comment_type,
    c.created_at,
    u.username AS author_username,
    (SELECT COUNT(*) FROM comment_votes WHERE comment_id = c.id AND vote_type = 'upvote') AS upvotes,
    (SELECT COUNT(*) FROM comment_votes WHERE comment_id = c.id AND vote_type = 'downvote') AS downvotes,
    (SELECT COUNT(*) FROM comment_votes WHERE comment_id = c.id AND vote_type = 'support') AS supports
FROM
    comments c
JOIN
    profiles u ON c.user_id = u.id;
