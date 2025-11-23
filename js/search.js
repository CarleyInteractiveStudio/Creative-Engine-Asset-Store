document.addEventListener('DOMContentLoaded', () => {
    const searchQuerySpan = document.getElementById('search-query');
    const searchResultsGrid = document.getElementById('search-results-grid');

    async function performSearch() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('query');

        if (!query) {
            searchQuerySpan.textContent = '...';
            searchResultsGrid.innerHTML = '<p>Por favor, introduce un término de búsqueda.</p>';
            return;
        }

        searchQuerySpan.textContent = query;

        // Se asume que window.supabaseClient está disponible gracias a main.js
        if (!window.supabaseClient) {
            console.error("Supabase client no encontrado. Asegúrate de que main.js se carga antes que search.js");
            searchResultsGrid.innerHTML = '<p class="error">Error de configuración. No se puede conectar a la base de datos.</p>';
            return;
        }

        const { data: products, error } = await window.supabaseClient
            .from('products_with_ratings')
            .select('*')
            .textSearch('fts', `'${query}'`, {
                type: 'websearch',
                config: 'spanish'
            })
            .order('total_stars', { ascending: false });

        if (error) {
            console.error('Error en la búsqueda:', error);
            searchResultsGrid.innerHTML = '<p class="error">Ocurrió un error al realizar la búsqueda.</p>';
            return;
        }

        if (!products || products.length === 0) {
            searchResultsGrid.innerHTML = '<p>No se encontraron resultados para tu búsqueda.</p>';
            return;
        }

        searchResultsGrid.innerHTML = products.map(createProductCard).join('');
    }

    performSearch();
});
