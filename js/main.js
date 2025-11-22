// Initialize the Supabase client
const { createClient } = supabase;
const supabaseUrl = 'https://tladrluezsmmhjbhupgb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsYWRybHVlenNtbWhqYmh1cGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY5NjQsImV4cCI6MjA3MTAwMjk2NH0.p7x3MPizmNdX57KzX5T4c15ytuH1oznjFqyp14HD-QU';

// Advertencia para el desarrollador si las claves no están configuradas
if (supabaseUrl === 'TU_SUPABASE_URL' || supabaseKey === 'TU_SUPABASE_KEY') {
    console.error("ADVERTENCIA: Las claves de Supabase no están configuradas en js/main.js. La aplicación no funcionará correctamente sin ellas. Reemplaza 'TU_SUPABASE_URL' y 'TU_SUPABASE_KEY' con tus claves reales.");
}

const supabaseClient = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    // Scripts para la Creative Engine Asset Store

    // Advertencia para el desarrollador sobre la configuración de PayPal
    if (document.querySelector('script[src*="YOUR_SANDBOX_CLIENT_ID"]')) {
    console.warn("ADVERTENCIA: El SDK de PayPal está usando un Client ID de prueba. Reemplaza 'YOUR_SANDBOX_CLIENT_ID' en product.html para que los pagos funcionen.");
}

// The defer attribute on the script tag ensures this runs after the DOM is parsed.
console.log("Creative Engine Asset Store script loaded.");

// --- Protección de Rutas de Admin ---
if (window.location.pathname.includes('admin.html')) {
        // Se usa un timeout para dar tiempo a que onAuthStateChange se ejecute primero
        setTimeout(() => {
            const isAdmin = sessionStorage.getItem('is_admin') === 'true';
            if (!isAdmin) {
                console.warn("Acceso denegado. Se requiere rol de administrador.");
                window.location.href = 'index.html';
            }
        }, 500); // 500ms de espera, ajustar si es necesario
    }

    // Lógica para la página de inicio de sesión
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;

            const { data: signInData, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                alert(`Error al iniciar sesión: ${error.message}`);
            } else {
                const user = signInData.user;
                const isAdmin = user.app_metadata && user.app_metadata.is_admin;
                sessionStorage.setItem('is_admin', isAdmin || false);
                console.log("DEBUG: 'is_admin' from metadata on login:", isAdmin);
                console.log("DEBUG: 'is_admin' guardado en sessionStorage como:", sessionStorage.getItem('is_admin'));

                // Fetch points separately
                const { data: profile, error: profileError } = await supabaseClient
                    .from('profiles')
                    .select('points')
                    .eq('id', user.id)
                    .single();

                if (profileError) {
                    console.error("DEBUG: Error al obtener el perfil (puntos):", profileError);
                } else if (profile) {
                    sessionStorage.setItem('user_points', profile.points);
                }

                alert('¡Inicio de sesión exitoso!');
                window.location.href = 'index.html';
            }
        });
    }

    // Lógica para la página de registro
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;
            const confirmPassword = e.target['confirm-password'].value;

            if (password !== confirmPassword) {
                alert('Las contraseñas no coinciden.');
                return;
            }

            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });

            if (error) {
                alert(`Error al registrar: ${error.message}`);
            } else {
                alert('¡Registro exitoso! Por favor, revisa tu correo para confirmar tu cuenta.');
                window.location.href = 'login.html';
            }
        });
    }

    // --- Gestión de la Sesión y UI ---
    const configBtn = document.getElementById('config-btn');
    const configDropdown = document.getElementById('config-dropdown');

    if (configBtn && configDropdown) {
        configBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            configDropdown.classList.toggle('active');
        });

        window.addEventListener('click', (e) => {
            if (configBtn && !configBtn.contains(e.target) && !configDropdown.contains(e.target)) {
                configDropdown.classList.remove('active');
            }
        });
    }

    async function updateUserUI(user) {
        if (!configDropdown) return;

        let dropdownHTML = '';
        if (user) {
            // If data isn't in session, fetch it now.
            if (sessionStorage.getItem('is_admin') === null) {
                // We need to get the user object again here to access app_metadata securely
                const { data: { user: authedUser } } = await supabaseClient.auth.getUser();
                const isAdmin = authedUser.app_metadata && authedUser.app_metadata.is_admin;
                sessionStorage.setItem('is_admin', isAdmin || false);
            }
            if (sessionStorage.getItem('user_points') === null) {
                const { data: profile } = await supabaseClient.from('profiles').select('points').eq('id', user.id).single();
                sessionStorage.setItem('user_points', profile ? profile.points : 0);
            }

            const userPoints = sessionStorage.getItem('user_points') || 0;
            const isAdmin = sessionStorage.getItem('is_admin') === 'true';

            let adminLink = '';
            if (isAdmin) {
                adminLink = '<a href="admin.html">Panel de Admin</a>';
            }

            dropdownHTML = `
                <div class="dropdown-points">Puntos: <strong>${userPoints}</strong></div>
                <hr class="dropdown-divider">
                <a href="my-assets.html">Mis Assets</a>
                <a href="dashboard.html">Mi Panel (Vendedor)</a>
                <a href="settings.html">Configuración</a>
                ${adminLink}
                <a href="#" id="logout-btn">Cerrar Sesión</a>
            `;
        } else {
            dropdownHTML = `
                <a href="login.html">Iniciar Sesión</a>
                <a href="register.html">Registrarse</a>
            `;
            sessionStorage.removeItem('user_points');
            sessionStorage.removeItem('is_admin');
        }
        configDropdown.innerHTML = dropdownHTML;

        const logoutButton = document.getElementById('logout-btn');
        if (logoutButton) {
            logoutButton.addEventListener('click', async (e) => {
                e.preventDefault();
                await supabaseClient.auth.signOut();
            });
        }
    }

    // Simplified, synchronous listener, as per the old working code.
    // updateUserUI is async and will handle fetching any necessary data.
    supabaseClient.auth.onAuthStateChange((event, session) => {
        updateUserUI(session?.user);
    });

    // Lógica para la página de subida de productos
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {

        const imagesInput = document.getElementById('product-images');
        imagesInput.addEventListener('change', (e) => {
            if (e.target.files.length > 3) {
                alert('Puedes seleccionar un máximo de 3 imágenes.');
                e.target.value = ''; // Limpiar la selección
            }
        });

        const priceInput = document.getElementById('price');
        const priceClarification = document.getElementById('price-clarification');

        if (priceInput && priceClarification) {
            priceInput.addEventListener('input', (e) => {
                if (e.target.value === '0') {
                    priceClarification.textContent = 'El producto se marcará como Gratuito.';
                } else {
                    priceClarification.textContent = '';
                }
            });
        }

        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                alert('Debes iniciar sesión para subir un producto.');
                window.location.href = 'login.html';
                return;
            }

            const productName = e.target['product-name'].value;
            const description = e.target['product-description'].value;
            const price = e.target.price.value;
            const categoryId = e.target.category.value;
            const youtubeUrl = e.target['youtube-link'].value;
            const mainFile = e.target['product-file'].files[0];
            const images = e.target['product-images'].files;

            if (!mainFile || images.length === 0) {
                alert('Debes seleccionar el archivo principal y al menos una imagen.');
                return;
            }

            if (images.length > 3) {
                alert('Puedes subir un máximo de 3 imágenes.');
                return;
            }

            // --- Lógica de Subida ---
            const overlay = document.getElementById('upload-overlay');
            const overlayMessage = document.getElementById('upload-message');
            const submitButton = uploadForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;

            const showOverlay = (message) => {
                overlayMessage.textContent = message;
                overlay.classList.add('visible');
            };

            const hideOverlay = () => {
                overlay.classList.remove('visible');
            };

            try {
                // Mostrar feedback visual
                submitButton.disabled = true;
                showOverlay('Subiendo producto...');

                // 1. Subir archivo principal
                overlayMessage.textContent = 'Subiendo archivo principal...';
                const timestamp = Date.now();
                const sanitizedMainFileName = mainFile.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
                const mainFilePath = `${user.id}/${timestamp}-${sanitizedMainFileName}`;
                const { error: mainFileError } = await supabaseClient.storage
                    .from('product_files')
                    .upload(mainFilePath, mainFile, {
                        // La privacidad del archivo es controlada por la política del bucket en Supabase,
                        // no por estas opciones. Estas opciones son para el control de caché.
                        cacheControl: '3600',
                        upsert: false
                    });
                if (mainFileError) throw mainFileError;

                // YA NO generamos una URL pública. Guardamos la RUTA.
                const mainFileUrl = mainFilePath;

                // 2. Insertar en la tabla 'products'
                overlayMessage.textContent = 'Guardando detalles del producto...';
                const { data: productData, error: productError } = await supabaseClient
                    .from('products')
                    .insert({
                        name: productName,
                        description: description,
                        price: price,
                        category_id: categoryId,
                        youtube_url: youtubeUrl,
                        seller_id: user.id,
                        main_file_url: mainFileUrl, // Guardamos la ruta, no la URL pública
                        status: 'pending'
                    })
                    .select()
                    .single();
                if (productError) throw productError;

                // 3. Subir imágenes y guardar en 'product_images'
                for (let i = 0; i < images.length; i++) {
                    const image = images[i];
                    overlayMessage.textContent = `Subiendo imagen ${i + 1} de ${images.length}...`;
                    const sanitizedImageName = image.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
                    const imagePath = `${user.id}/${productData.id}/${sanitizedImageName}`;
                    const { error: imageError } = await supabaseClient.storage
                        .from('product_images')
                        .upload(imagePath, image);
                    if (imageError) throw imageError;

                    const { data: { publicUrl: imageUrl } } = supabaseClient.storage.from('product_images').getPublicUrl(imagePath);

                    const { error: productImageError } = await supabaseClient
                        .from('product_images')
                        .insert({ product_id: productData.id, image_url: imageUrl });
                    if(productImageError) throw productImageError;
                }

                showOverlay('¡Producto subido exitosamente! Redirigiendo...');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);

            } catch (error) {
                console.error('Error al subir el producto:', error);
                showOverlay(`Error: ${error.message}`);
                setTimeout(hideOverlay, 3000); // Ocultar mensaje de error después de 3 segundos
            } finally {
                // Restaurar botón
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }

    // Lógica para la página de dashboard
    const productListDiv = document.getElementById('product-list');
    if (productListDiv) {
        async function loadUserProducts() {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            // --- Cargar Historial de Pagos ---
            const payoutHistoryList = document.getElementById('payout-history-list');
            const { data: payouts, error: payoutError } = await supabaseClient
                .from('payouts')
                .select('*')
                .eq('seller_id', user.id)
                .order('created_at', { ascending: false });

            if (payoutError) {
                payoutHistoryList.innerHTML = '<p class="error">No se pudo cargar el historial de pagos.</p>';
            } else if (payouts.length === 0) {
                payoutHistoryList.innerHTML = '<p>No has recibido ningún pago todavía.</p>';
            } else {
                let historyHTML = '<ul>';
                for (const payout of payouts) {
                    historyHTML += `<li>${new Date(payout.created_at).toLocaleDateString()}: <strong>\$${payout.amount.toFixed(2)}</strong> - Estado: ${payout.status}</li>`;
                }
                historyHTML += '</ul>';
                payoutHistoryList.innerHTML = historyHTML;
            }

            // --- Cargar Resumen de Ganancias (Real) ---
            const earningsDiv = document.getElementById('earnings-data');

            // 1. Get all products for the current seller
            const { data: sellerProducts, error: productsError } = await supabaseClient
                .from('products')
                .select('id')
                .eq('seller_id', user.id);

            if (productsError) {
                console.error('Error fetching seller products for earnings:', productsError);
                earningsDiv.innerHTML = '<p class="error">No se pudieron calcular las ganancias.</p>';
            } else {
                const productIds = sellerProducts.map(p => p.id);

                // 2. Get all sales for those products
                const { data: sales, error: salesError } = await supabaseClient
                    .from('user_owned_assets')
                    .select('purchase_price')
                    .in('product_id', productIds);

                if (salesError) {
                    console.error('Error fetching sales for earnings:', salesError);
                    earningsDiv.innerHTML = '<p class="error">No se pudieron calcular las ganancias.</p>';
                } else {
                    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.purchase_price || 0), 0);

                    let commissionRate = 0.10; // 10% base commission
                    if (totalRevenue > 500) {
                        commissionRate = 0.20; // 20% for high earners
                    } else if (totalRevenue > 100) {
                        commissionRate = 0.15; // 15% for medium earners
                    }
                    const commissionAmount = totalRevenue * commissionRate;
                    const netPayout = totalRevenue - commissionAmount;

                    earningsDiv.innerHTML = `
                        <div class="earning-item">Ingresos Totales: <strong>\$${totalRevenue.toFixed(2)}</strong></div>
                        <div class="earning-item">Comisión de la Tienda (${commissionRate * 100}%): <strong>-\$${commissionAmount.toFixed(2)}</strong></div>
                        <div class="earning-item">Pago Neto Estimado: <strong>\$${netPayout.toFixed(2)}</strong></div>
                        <div class="earning-item">Próximo Día de Pago: <strong>Fin de mes</strong></div>
                    `;
                }
            }


            const { data: products, error } = await supabaseClient
                .from('products')
                .select('*')
                .eq('seller_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error al cargar los productos:', error);
                productListDiv.innerHTML = '<p class="error">No se pudieron cargar tus productos.</p>';
                return;
            }

            if (!products || products.length === 0) {
                productListDiv.innerHTML = '<p>No has subido ningún producto todavía.</p>';
                return;
            }

            const productPromises = products.map(async (product) => {
                const { data: images, error: imageError } = await supabaseClient
                    .from('product_images')
                    .select('image_url')
                    .eq('product_id', product.id)
                    .limit(1);

                let imageUrl = 'https://via.placeholder.com/100x75.png?text=No+Image';
                if (!imageError && images && images.length > 0) {
                    imageUrl = images[0].image_url;
                }

                return `
                    <div class="pending-product-item">
                        <img src="${imageUrl}" alt="${product.name}" class="dashboard-product-thumbnail">
                        <div class="pending-product-info">
                            <h3>${product.name}</h3>
                            <p><strong>Estado:</strong> ${product.status}</p>
                        </div>
                        <div class="pending-product-actions">
                            <a href="product.html?id=${product.id}" class="btn btn-secondary">Ver Página</a>
                            <a href="${product.main_file_url}" class="btn btn-primary" download>Descargar</a>
                        </div>
                    </div>
                `;
            });

            const productHTML = await Promise.all(productPromises);
            productListDiv.innerHTML = productHTML.join('');
        }

        loadUserProducts();
        loadAdminStats();
    }

    // Lógica para la página de Admin
    const pendingProductsList = document.getElementById('pending-products-list');
    if (pendingProductsList) {
        async function loadAdminStats() {
            // 1. Total de productos
            const { count, error: countError } = await supabaseClient
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'approved');
            document.getElementById('stats-total-products').textContent = countError ? 'N/A' : count;

            // 2. Ingresos (Real)
            const { data: allSales, error: salesError } = await supabaseClient
                .from('user_owned_assets')
                .select('purchase_price, created_at');

            if (salesError) {
                console.error('Error fetching all sales for admin stats:', salesError);
                document.getElementById('stats-total-revenue').textContent = 'N/A';
                document.getElementById('stats-monthly-sales').textContent = 'N/A';
            } else {
                const totalRevenue = allSales.reduce((sum, sale) => sum + (sale.purchase_price || 0), 0);
                document.getElementById('stats-total-revenue').textContent = `\$${totalRevenue.toFixed(2)}`;

                // Calculate this month's sales
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

                const monthlySales = allSales
                    .filter(sale => new Date(sale.created_at) >= startOfMonth)
                    .reduce((sum, sale) => sum + (sale.purchase_price || 0), 0);

                document.getElementById('stats-monthly-sales').textContent = `\$${monthlySales.toFixed(2)}`;
            }
        }

        async function loadPendingProducts() {
            const { data: products, error } = await supabaseClient
                .from('products')
                .select(`
                    id,
                    name,
                    price,
                    profiles ( id, username )
                `)
                .eq('status', 'pending');

            if (error) {
                console.error('Error cargando productos pendientes:', error);
                pendingProductsList.innerHTML = '<p class="error">No se pudieron cargar los productos.</p>';
                return;
            }

            if (products.length === 0) {
                pendingProductsList.innerHTML = '<p>No hay productos pendientes de revisión.</p>';
                return;
            }

            const productPromises = products.map(async (product) => {
                const { data: images, error: imageError } = await supabaseClient
                    .from('product_images')
                    .select('image_url')
                    .eq('product_id', product.id)
                    .limit(1);

                let imageUrl = 'https://via.placeholder.com/100x75.png?text=No+Image';
                if (!imageError && images && images.length > 0) {
                    imageUrl = images[0].image_url;
                }

                return `
                    <div class="pending-product-item" id="product-${product.id}">
                        <img src="${imageUrl}" alt="${product.name}" class="dashboard-product-thumbnail">
                        <div class="pending-product-info">
                            <h3><a href="product.html?id=${product.id}">${product.name}</a></h3>
                            <p>Vendedor: ${product.profiles.username || 'N/A'} | Precio: \$${product.price.toFixed(2)}</p>
                        </div>
                        <div class="pending-product-actions">
                            <button class="btn btn-primary approve-btn" data-id="${product.id}">Aprobar</button>
                            <button class="btn btn-secondary reject-btn" data-id="${product.id}">Rechazar</button>
                        </div>
                    </div>
                `;
            });

            const productHTML = await Promise.all(productPromises);
            pendingProductsList.innerHTML = productHTML.join('');
        }

        // Lógica para los botones de Aprobar/Rechazar y el modal
        const modal = document.getElementById('rejection-modal');
        const closeModalBtn = modal.querySelector('.close-btn');
        const submitRejectionBtn = modal.querySelector('#submit-rejection-btn');
        const rejectionReasonText = modal.querySelector('#rejection-reason-text');
        let currentRejectingProductId = null;

        closeModalBtn.addEventListener('click', () => modal.style.display = 'none');

        async function handleApproval(productId) {
            try {
                const { data, error } = await supabaseClient.functions.invoke('admin-approve-product', {
                    body: { productId },
                });

                if (error) throw error;
                if (data.error) throw new Error(data.error);

                alert(data.message);
                document.getElementById(`product-${productId}`).remove();

            } catch (err) {
                alert(`Error al aprobar el producto: ${err.message}`);
                console.error(err);
            }
        }

        async function handleRejection(productId, reason) {
            try {
                const { data, error } = await supabaseClient.functions.invoke('admin-reject-product', {
                    body: { productId, reason },
                });

                if (error) throw error;
                if (data.error) throw new Error(data.error);

                alert(data.message);
                modal.style.display = 'none';
                document.getElementById(`product-${productId}`).remove();

            } catch (err) {
                alert(`Error al rechazar el producto: ${err.message}`);
                console.error(err);
            }
        }

        pendingProductsList.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('approve-btn')) {
                handleApproval(target.dataset.id);
            } else if (target.classList.contains('reject-btn')) {
                currentRejectingProductId = target.dataset.id;
                rejectionReasonText.value = '';
                modal.style.display = 'block';
            }
        });

        submitRejectionBtn.addEventListener('click', () => {
            const reason = rejectionReasonText.value;
            if (!reason) {
                alert('Por favor, introduce un motivo para el rechazo.');
                return;
            }
            handleRejection(currentRejectingProductId, reason);
        });


        loadPendingProducts();
        loadAdminStats();
    }

    // Lógica para cargar productos en la página de inicio
    const featuredAssetGrid = document.querySelector('#featured .asset-grid');
    if (featuredAssetGrid) {
        async function loadFeaturedProducts() {
            const { data: products, error } = await supabaseClient
                .from('products')
                .select('*')
                .eq('status', 'approved')
                .order('created_at', { ascending: false })
                .limit(4);

            if (error) {
                console.error('Error cargando productos destacados:', error);
                return;
            }

            if (!products || products.length === 0) {
                featuredAssetGrid.innerHTML = '<p>No hay productos destacados en este momento.</p>';
                return;
            }

            // --- Carga de Ratings (separada y tolerante a fallos) ---
            const productIds = products.map(p => p.id);
            const { data: ratings, error: ratingsError } = await supabaseClient
                .from('products_with_ratings')
                .select('id, average_rating, rating_count')
                .in('id', productIds);

            if (ratingsError) {
                console.warn("No se pudieron cargar los ratings de los productos. Mostrando sin ellos.", ratingsError);
            } else {
                // Inyectar los datos de rating en los objetos de producto
                products.forEach(product => {
                    const ratingData = ratings.find(r => r.id === product.id);
                    if (ratingData) {
                        product.average_rating = ratingData.average_rating;
                        product.rating_count = ratingData.rating_count;
                    }
                });
            }
            // --- Fin de la carga de Ratings ---

            const productPromises = products.map(async (product) => {
                const { data: images, error: imageError } = await supabaseClient
                    .from('product_images')
                    .select('image_url')
                    .eq('product_id', product.id)
                    .limit(1);

                let imageUrl = 'https://via.placeholder.com/300x200.png?text=No+Image';
                if (imageError) {
                    console.error(`Error fetching image for product ${product.id}:`, imageError);
                } else if (images && images.length > 0) {
                    imageUrl = images[0].image_url;
                }

                const starCountHTML = renderStarCount(product.rating_count);

                return `
                    <a href="product.html?id=${product.id}" class="asset-card">
                        <button class="wishlist-btn" data-product-id="${product.id}">❤️</button>
                        <img src="${imageUrl}" alt="${product.name}" class="asset-image">
                        <div class="asset-info">
                            <h3 class="asset-title">${product.name}</h3>
                            <div class="asset-rating-summary">${starCountHTML}</div>
                            <p class="asset-price">${product.price === 0 ? 'Gratis' : `\$${product.price.toFixed(2)}`}</p>
                        </div>
                    </a>
                `;
            });

            const productHTML = await Promise.all(productPromises);
            featuredAssetGrid.innerHTML = productHTML.join('');
        }
        loadFeaturedProducts();
    }

    // Lógica para cargar categorías dinámicamente en la página de inicio
    const categoryGrid = document.querySelector('.category-browser .category-grid');
    if (categoryGrid) {
        async function loadCategories() {
            console.log("Iniciando la carga de categorías...");
            const { data: categories, error } = await supabaseClient
                .from('categories')
                .select('name, slug')
                .order('name', { ascending: true });

            if (error) {
                console.error('Error al cargar categorías:', error);
                categoryGrid.innerHTML = '<p class="error">No se pudieron cargar las categorías.</p>';
                return;
            }

            console.log("Categorías recibidas:", categories);

            if (!categories || categories.length === 0) {
                console.warn("No se encontraron categorías en la base de datos.");
                categoryGrid.innerHTML = '<p>No hay categorías para mostrar.</p>';
                return;
            }

            const categoryHTML = categories.map(category => `
                <a href="category.html?category=${category.slug}" class="category-card">
                    ${category.name}
                </a>
            `).join('');

            categoryGrid.innerHTML = categoryHTML;
            console.log("Categorías cargadas en el DOM.");
        }
        loadCategories();
    }

    // Lógica para cargar productos en la página de categoría
    const categoryAssetGrid = document.querySelector('.category-content .asset-grid');
    if (categoryAssetGrid) {
        async function loadCategoryProducts() {
            const urlParams = new URLSearchParams(window.location.search);
            const categoryName = urlParams.get('category');

            // Actualizar el título de la página
            const categoryTitleElement = document.querySelector('.category-title');
            if (categoryTitleElement) {
                if (categoryName) {
                    // Formatear el nombre para mostrar (e.g., 'code-scripts' -> 'Code Scripts')
                    const formattedName = categoryName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    categoryTitleElement.textContent = formattedName;
                } else {
                    categoryTitleElement.textContent = 'Todos los Productos';
                }
            }

            let query = supabaseClient
                .from('products')
                .select('*')
                .eq('status', 'approved');

            // Si hay un nombre de categoría en la URL, lo usamos para filtrar.
            if (categoryName) {
                // Asumimos que la tabla 'categories' tiene una columna 'slug' que coincide
                // con el parámetro de la URL (e.g., 'code-scripts').
                // Primero, obtenemos el ID de la categoría a partir de su slug.
                const { data: category, error: categoryError } = await supabaseClient
                    .from('categories')
                    .select('id')
                    .eq('slug', categoryName)
                    .single();

                if (categoryError || !category) {
                    console.error('Error: No se encontró la categoría:', categoryName);
                    categoryAssetGrid.innerHTML = '<p>La categoría especificada no existe.</p>';
                    return;
                }

                // Luego, filtramos los productos por ese ID de categoría.
                query = query.eq('category_id', category.id);
            }

            const { data: products, error } = await query;

            if (error) {
                console.error('Error cargando productos de categoría:', error);
                return;
            }

            if (!products || products.length === 0) {
                categoryAssetGrid.innerHTML = '<p>No hay productos en esta categoría.</p>';
                return;
            }

            // --- Carga de Ratings (separada y tolerante a fallos) ---
            const productIds = products.map(p => p.id);
            const { data: ratings, error: ratingsError } = await supabaseClient
                .from('products_with_ratings')
                .select('id, average_rating, rating_count')
                .in('id', productIds);

            if (ratingsError) {
                console.warn("No se pudieron cargar los ratings de los productos de la categoría. Mostrando sin ellos.", ratingsError);
            } else {
                products.forEach(product => {
                    const ratingData = ratings.find(r => r.id === product.id);
                    if (ratingData) {
                        product.average_rating = ratingData.average_rating;
                        product.rating_count = ratingData.rating_count;
                    }
                });
            }
            // --- Fin de la carga de Ratings ---

            const productPromises = products.map(async (product) => {
                const { data: images, error: imageError } = await supabaseClient
                    .from('product_images')
                    .select('image_url')
                    .eq('product_id', product.id)
                    .limit(1);

                let imageUrl = 'https://via.placeholder.com/300x200.png?text=No+Image';
                if (imageError) {
                    console.error(`Error fetching image for product ${product.id}:`, imageError);
                } else if (images && images.length > 0) {
                    imageUrl = images[0].image_url;
                }

                const starCountHTML = renderStarCount(product.rating_count);

                return `
                    <a href="product.html?id=${product.id}" class="asset-card">
                        <button class="wishlist-btn" data-product-id="${product.id}">❤️</button>
                        <img src="${imageUrl}" alt="${product.name}" class="asset-image">
                        <div class="asset-info">
                            <h3 class="asset-title">${product.name}</h3>
                             <div class="asset-rating-summary">${starCountHTML}</div>
                            <p class="asset-price">${product.price === 0 ? 'Gratis' : `\$${product.price.toFixed(2)}`}</p>
                        </div>
                    </a>
                `;
            });

            const productHTML = await Promise.all(productPromises);
            categoryAssetGrid.innerHTML = productHTML.join('');
        }
        loadCategoryProducts();
    }

    const approvedProductsList = document.getElementById('approved-products-list');
    if (approvedProductsList) {
        async function loadApprovedProducts() {
             const { data: products, error } = await supabaseClient
                .from('products')
                .select(`
                    id,
                    name,
                    price,
                    is_suspended,
                    profiles ( id, username )
                `)
                .eq('status', 'approved');

            if (error) {
                console.error('Error cargando productos aprobados:', error);
                return;
            }

            const productPromises = products.map(async (product) => {
                const { data: images, error: imageError } = await supabaseClient
                    .from('product_images')
                    .select('image_url')
                    .eq('product_id', product.id)
                    .limit(1);

                let imageUrl = 'https://via.placeholder.com/100x75.png?text=No+Image';
                if (!imageError && images && images.length > 0) {
                    imageUrl = images[0].image_url;
                }

                const suspendButtonText = product.is_suspended ? 'Rehabilitar' : 'Suspender';
                return `
                    <div class="pending-product-item" id="product-approved-${product.id}">
                        <img src="${imageUrl}" alt="${product.name}" class="dashboard-product-thumbnail">
                        <div class="pending-product-info">
                            <h3><a href="product.html?id=${product.id}">${product.name}</a> ${product.is_suspended ? '(Suspendido)' : ''}</h3>
                            <p>Vendedor: ${product.profiles.username || 'N/A'}</p>
                        </div>
                        <div class="pending-product-actions">
                            <a href="edit-product.html?id=${product.id}" class="btn btn-secondary">Editar</a>
                            <button class="btn btn-secondary suspend-btn" data-id="${product.id}" data-suspended="${product.is_suspended}">${suspendButtonText}</button>
                            <button class="btn btn-danger delete-btn" data-id="${product.id}">Borrar</button>
                        </div>
                    </div>
                `;
            });

            const productHTML = await Promise.all(productPromises);
            approvedProductsList.innerHTML = productHTML.join('') || '<p>No hay productos aprobados.</p>';
        }
        loadApprovedProducts();

        // Lógica para los botones de Suspender/Borrar
        approvedProductsList.addEventListener('click', async (e) => {
            const target = e.target;
            const id = target.dataset.id;

            if (target.classList.contains('suspend-btn')) {
                const isSuspended = target.dataset.suspended === 'true';
                const { error } = await supabaseClient.from('products').update({ is_suspended: !isSuspended }).eq('id', id);
                if (error) {
                    alert('Error al actualizar el estado del producto.');
                } else {
                    // Actualizar UI
                    target.dataset.suspended = !isSuspended;
                    target.textContent = !isSuspended ? 'Rehabilitar' : 'Suspender';
                    document.querySelector(`#product-approved-${id} h3`).classList.toggle('suspended-text');
                    // Notificar
                    supabaseClient.functions.invoke('send-product-status-email', { body: { productId: id, status: !isSuspended ? 'unsuspended' : 'suspended' } });
                }
            } else if (target.classList.contains('delete-btn')) {
                if (confirm('¿Estás seguro de que quieres borrar este producto permanentemente? Esta acción no se puede deshacer.')) {
                    try {
                        const { data, error } = await supabaseClient.functions.invoke('admin-delete-product', {
                            body: { productId: id },
                        });

                        if (error) throw error;
                        if (data.error) throw new Error(data.error);

                        alert(data.message);
                        document.getElementById(`product-approved-${id}`).remove();

                    } catch (err) {
                        alert(`Error al borrar el producto: ${err.message}`);
                        console.error('Error during secure deletion process:', err);
                    }
                }
            }
        });
    }

    // Lógica para renderizar el botón de PayPal
    const paypalButtonContainer = document.getElementById('paypal-button-container');
    if (paypalButtonContainer) {
        const productActions = document.querySelector('.product-actions');
        const productId = productActions.querySelector('.btn-buy-points').dataset.productId;

        if (typeof paypal !== 'undefined') {
            paypal.Buttons({
                async createOrder() {
                    const productIdElement = document.querySelector('.product-actions .btn-buy-points');
                    const productId = productIdElement ? productIdElement.dataset.productId : null;

                    if (!productId) {
                        console.error("PayPal createOrder error: Could not find product ID on the page.");
                        alert("Error: No se pudo encontrar la información del producto para iniciar el pago.");
                        // Must return a rejected promise to notify the PayPal SDK of failure
                        return Promise.reject(new Error("Product ID not found"));
                    }

                    const { data, error } = await supabaseClient.functions.invoke('paypal-create-order', {
                        body: { productId },
                    });

                    if (error) {
                        console.error("Error invoking Edge Function 'paypal-create-order':", error);
                        // The detailed error from the function is in the error object itself.
                        // Let's log the whole context to see what we get.
                        console.error("Detailed error context from function:", error.context);
                        // The error message from our function is in the 'context' property if it's a FunctionsHttpError
                        const detailedMessage = error.context?.errorMessage || error.message;
                        // Re-throw the error to be caught by the PayPal SDK's onError handler
                        throw new Error(`Edge Function failed: ${detailedMessage}`);
                    }

                    if (!data || !data.orderID) {
                        console.error("Invalid response from 'paypal-create-order'. Missing orderID:", data);
                        throw new Error("Did not receive a valid order ID from the server.");
                    }

                    return data.orderID;
                },
                async onApprove(data) {
                    // The 'data' object from onApprove contains orderID, payerID etc.
                    const productIdElement = document.querySelector('.product-actions .btn-buy-points');
                    const productId = productIdElement ? productIdElement.dataset.productId : null;

                    if (!productId) {
                         alert('Error crítico: No se pudo encontrar el ID del producto después de la aprobación. Contacta a soporte.');
                         return;
                    }

                    const { data: responseData, error } = await supabaseClient.functions.invoke('paypal-capture-order', {
                        body: { orderID: data.orderID, productId: productId },
                    });

                    if (error) {
                        console.error("Error invoking Edge Function 'paypal-capture-order':", error);
                        console.error("Detailed error data from function:", responseData);
                        const detailedMessage = responseData?.errorMessage || "Error procesando el pago.";
                        // Throwing here will trigger the onError handler below
                        throw new Error(detailedMessage);
                    }

                    alert('¡Compra exitosa! El asset ha sido añadido a tu colección.');
                    window.location.href = 'my-assets.html';
                },
                onError(err) {
                    // This catches errors from createOrder and onApprove
                    console.error('An error occurred in the PayPal SDK. This is often caused by an error in createOrder or onApprove. See previous logs for details.', err);
                    alert(`Ocurrió un error en el proceso de pago: ${err.message}. Por favor, revisa la consola del navegador (F12) para más detalles.`);
                }
            }).render('#paypal-button-container');
        } else {
            console.error('El SDK de PayPal no se ha cargado.');
        }
    }

    // Lógica para la página de edición de productos
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (!productId) {
            window.location.href = 'admin.html';
        }

        // Cargar datos del producto
        async function loadProductForEdit() {
            const { data: product, error } = await supabaseClient
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();

            if (error || !product) {
                alert('No se pudo cargar el producto para editar.');
                window.location.href = 'admin.html';
                return;
            }

            document.getElementById('product-name').value = product.name;
            document.getElementById('product-description').value = product.description;
            document.getElementById('price').value = product.price;
            document.getElementById('category').value = product.category_id;
        }

        // Guardar cambios
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatedData = {
                name: document.getElementById('product-name').value,
                description: document.getElementById('product-description').value,
                price: document.getElementById('price').value,
                category_id: document.getElementById('category').value,
            };

            const { error } = await supabaseClient
                .from('products')
                .update(updatedData)
                .eq('id', productId);

            if (error) {
                alert('Error al guardar los cambios.');
                console.error(error);
            } else {
                alert('Producto actualizado exitosamente.');
                // Aquí llamaríamos a la Edge Function
                supabaseClient.functions.invoke('send-product-status-email', { body: { productId: productId, status: 'edited' } });
                window.location.href = 'admin.html';
            }
        });

        loadProductForEdit();
    }


    // Lógica para la página de configuración de pagos
    const payoutForm = document.getElementById('payout-form');
    if (payoutForm) {
        const emailInput = document.getElementById('paypal-email');

        async function loadPayoutSettings() {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            const { data, error } = await supabaseClient
                .from('profiles')
                .select('paypal_email')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Error al cargar la configuración de pago:', error);
            } else if (data && data.paypal_email) {
                emailInput.value = data.paypal_email;
            }
        }

        payoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newEmail = document.getElementById('paypal-email').value;
            const password = document.getElementById('current-password').value;
            const submitButton = payoutForm.querySelector('button[type="submit"]');

            if (!password) {
                alert('Por favor, introduce tu contraseña para confirmar los cambios.');
                return;
            }

            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Guardando...';

            try {
                const { data, error } = await supabaseClient.functions.invoke('update-paypal-email', {
                    body: { newEmail, password },
                });

                if (error) throw new Error(`Error de la función: ${error.message}`);
                if (data.error) throw new Error(data.error);

                alert(data.message);
                document.getElementById('current-password').value = ''; // Limpiar campo de contraseña

            } catch (err) {
                alert(`Error al guardar la configuración: ${err.message}`);
                console.error(err);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });

        loadPayoutSettings();
    }

    // Lógica para la página "Mis Assets" - Pestaña Lista de Deseos
    const wishlistDiv = document.getElementById('wishlist-assets-list');
    if(wishlistDiv) {
        async function loadWishlist() {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            const { data, error } = await supabaseClient
                .from('wishlist_items')
                .select(`
                    products (
                        id,
                        name,
                        price
                    )
                `)
                .eq('user_id', user.id);

            if (error) {
                console.error('Error al cargar la lista de deseos:', error);
                wishlistDiv.innerHTML = '<p class="error">No se pudo cargar tu lista de deseos.</p>';
                return;
            }

            if (!data || data.length === 0) {
                wishlistDiv.innerHTML = '<p>Tu lista de deseos está vacía.</p>';
                return;
            }

            const productPromises = data.map(async (item) => {
                const product = item.products;
                const { data: images, error: imageError } = await supabaseClient
                    .from('product_images')
                    .select('image_url')
                    .eq('product_id', product.id)
                    .limit(1);

                let imageUrl = 'https://via.placeholder.com/300x200.png?text=No+Image';
                if (imageError) {
                    console.error(`Error fetching image for product ${product.id}:`, imageError);
                } else if (images && images.length > 0) {
                    imageUrl = images[0].image_url;
                }

                return `
                    <a href="product.html?id=${product.id}" class="asset-card">
                        <button class="wishlist-btn active" data-product-id="${product.id}">❤️</button>
                        <img src="${imageUrl}" alt="${product.name}" class="asset-image">
                        <div class="asset-info">
                            <h3 class="asset-title">${product.name}</h3>
                            <p class="asset-price">${product.price === 0 ? 'Gratis' : `\$${product.price.toFixed(2)}`}</p>
                        </div>
                    </a>
                `;
            });

            const productHTML = await Promise.all(productPromises);
            wishlistDiv.innerHTML = '<div class="asset-grid">' + productHTML.join('') + '</div>';
        }

        loadWishlist();
    }

    // Lógica para la página "Mis Assets" - Pestaña Mis Compras
    const purchasedDiv = document.getElementById('purchased-assets-list');
    if(purchasedDiv) {
        async function loadPurchasedAssets() {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            const { data, error } = await supabaseClient
                .from('user_owned_assets')
                .select('products(*)')
                .eq('user_id', user.id);

            if (error) {
                console.error('Error al cargar los assets comprados:', error);
                purchasedDiv.innerHTML = '<p class="error">No se pudieron cargar tus assets.</p>';
                return;
            }

            if (!data || data.length === 0) {
                purchasedDiv.innerHTML = '<p>No has comprado u obtenido ningún asset todavía.</p>';
                return;
            }

            const productPromises = data.map(async (item) => {
                const product = item.products;
                const { data: images, error: imageError } = await supabaseClient
                    .from('product_images')
                    .select('image_url')
                    .eq('product_id', product.id)
                    .limit(1);

                let imageUrl = 'https://via.placeholder.com/300x200.png?text=No+Image';
                if (imageError) {
                    console.error(`Error fetching image for product ${product.id}:`, imageError);
                } else if (images && images.length > 0) {
                    imageUrl = images[0].image_url;
                }

                return `
                    <div class="asset-card my-asset-card">
                        <a href="product.html?id=${product.id}">
                            <img src="${imageUrl}" alt="${product.name}" class="asset-image">
                        </a>
                        <div class="asset-info">
                            <a href="product.html?id=${product.id}" style="text-decoration: none; color: inherit;">
                                <h3 class="asset-title">${product.name}</h3>
                            </a>
                            <button class="btn btn-primary download-btn" data-product-id="${product.id}">Descargar</button>
                        </div>
                    </div>
                `;
            });

            const productHTML = await Promise.all(productPromises);
            purchasedDiv.innerHTML = '<div class="asset-grid">' + productHTML.join('') + '</div>';
        }

        loadPurchasedAssets();
    }

    // Lógica para mostrar el botón correcto en la página de producto
    const productActions = document.querySelector('.product-actions');
    if (productActions) {
        const buyButton = productActions.querySelector('.btn-buy');
        const freeButton = productActions.querySelector('.btn-get-free');

        if (buyButton && freeButton) {
            const price = parseFloat(buyButton.dataset.price);

            if (price === 0) {
                buyButton.style.display = 'none';
                freeButton.style.display = 'inline-block';
                // Actualizar también el texto del precio
                const priceDisplay = document.querySelector('.product-info-panel .product-price');
                if (priceDisplay) {
                    priceDisplay.textContent = 'Gratis';
                }
            }
        }
    }

    // --- Lógica de Obtener Gratis y Comprar ---
    async function handleGetFreeClick(e) {
        const button = e.target.closest('.btn-get-free');
        if (!button) return;

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            alert('Debes iniciar sesión para obtener un asset.');
            window.location.href = 'login.html';
            return;
        }

        const productId = button.dataset.productId;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Obteniendo...';

        try {
            const { data, error } = await supabaseClient.functions.invoke('get-free-asset', {
                body: { productId },
            });

            if (error) {
                // Esto maneja errores de red o de invocación de la función
                throw new Error(`Error de la función: ${error.message}`);
            }

            if (data.error) {
                // Esto maneja errores lanzados dentro de la función (ej. el producto no es gratis)
                throw new Error(data.error);
            }

            alert(data.message || '¡Asset añadido a tu colección!');
            button.textContent = 'En tu colección';
            // El botón permanece deshabilitado

        } catch (err) {
            console.error('Error al obtener el asset gratuito:', err);
            alert(`No se pudo obtener el asset: ${err.message}`);
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    document.body.addEventListener('click', handleGetFreeClick);

    async function handleDownloadAsset(e) {
        const button = e.target.closest('.download-btn');
        if (!button) return;

        const productId = button.dataset.productId;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Generando...';

        try {
            const { data, error } = await supabaseClient.functions.invoke('create-download-link', {
                body: { productId },
            });

            if (error) {
                throw new Error(`Error de la función: ${error.message}`);
            }

            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.signedUrl) {
                throw new Error("No se recibió un enlace de descarga válido.");
            }

            const link = document.createElement('a');
            link.href = data.signedUrl;
            link.download = '';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err) {
            console.error('Error al descargar:', err);
            alert(`No se pudo generar el enlace de descarga: ${err.message}`);
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }
    document.body.addEventListener('click', handleDownloadAsset);

    async function handleBuyWithPoints(e) {
        const button = e.target.closest('.btn-buy-points');
        if (!button) return;

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            alert('Debes iniciar sesión para usar tus puntos.');
            return;
        }

        const price = parseFloat(button.dataset.price);
        const pointCost = price * 100;

        const { data: profile } = await supabaseClient.from('profiles').select('points').eq('id', user.id).single();
        if (profile.points < pointCost) {
            alert('No tienes suficientes puntos para comprar este asset.');
            return;
        }

        if (confirm(`¿Estás seguro de que quieres gastar ${pointCost} puntos en este asset?`)) {
            const newPoints = profile.points - pointCost;
            const { error: updateError } = await supabaseClient.from('profiles').update({ points: newPoints }).eq('id', user.id);
            if (updateError) {
                alert('Error al actualizar tus puntos.');
                return;
            }

            const productId = button.dataset.productId;
            await supabaseClient.from('points_transactions').insert({ user_id: user.id, amount: -pointCost, description: `Comprado producto #${productId}` });
            await supabaseClient.from('user_owned_assets').insert({ user_id: user.id, product_id: productId, purchase_price: price });

            alert('¡Compra con puntos exitosa! El asset ha sido añadido a tu colección.');
            button.textContent = 'En tu colección';
            button.disabled = true;
            document.querySelector('.btn-buy').style.display = 'none';
        }
    }
    document.body.addEventListener('click', handleBuyWithPoints);


    // --- Lógica de la Lista de Deseos ---
    async function handleWishlistClick(e) {
        const button = e.target.closest('.wishlist-btn, .wishlist-btn-large');
        if (!button) return;

        // Prevent the parent link from being followed
        e.preventDefault();
        e.stopPropagation();

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            alert('Debes iniciar sesión para añadir a tu lista de deseos.');
            window.location.href = 'login.html';
            return;
        }

        const productId = button.dataset.productId;

        // Comprobar si ya existe
        const { data: existing, error: checkError } = await supabaseClient
            .from('wishlist_items')
            .select('*')
            .eq('user_id', user.id)
            .eq('product_id', productId)
            .maybeSingle();

        if (checkError) {
            console.error('Error al comprobar la lista de deseos:', checkError);
            return;
        }

        if (existing) {
            // Eliminar de la lista
            const { error: deleteError } = await supabaseClient
                .from('wishlist_items')
                .delete()
                .match({ id: existing.id });
            if (deleteError) {
                console.error('Error al eliminar de la lista de deseos:', deleteError);
            } else {
                button.classList.remove('active');
            }
        } else {
            // Añadir a la lista
            const { error: insertError } = await supabaseClient
                .from('wishlist_items')
                .insert({ user_id: user.id, product_id: productId });
            if (insertError) {
                console.error('Error al añadir a la lista de deseos:', insertError);
            } else {
                button.classList.add('active');
            }
        }
    }

    document.body.addEventListener('click', handleWishlistClick);


    // Lógica para las pestañas en my-assets.html
    const tabs = document.querySelector('.tabs');
    if (tabs) {
        const tabLinks = document.querySelectorAll('.tab-link');
        const tabContents = document.querySelectorAll('.tab-content');

        tabLinks.forEach(link => {
            link.addEventListener('click', () => {
                const tabId = link.getAttribute('data-tab');

                // Desactivar todos
                tabLinks.forEach(item => item.classList.remove('active'));
                tabContents.forEach(item => item.classList.remove('active'));

                // Activar el correcto
                link.classList.add('active');
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    // --- Lógica para la página de producto ---
    if (window.location.pathname.includes('product.html')) {
        async function loadProductDetails() {
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get('id');

            if (!productId) {
                document.querySelector('.container').innerHTML = '<h1>Producto no encontrado</h1><p>El ID del producto no se encontró en la URL.</p>';
                return;
            }

            // 1. Fetch product and seller info
            const { data: product, error: productError } = await supabaseClient
                .from('products')
                .select('*, profiles(username)')
                .eq('id', productId)
                .single();

            if (productError || !product) {
                console.error('Error fetching product:', productError);
                document.querySelector('.container').innerHTML = '<h1>Error</h1><p>No se pudo cargar el producto. Es posible que no exista o haya sido eliminado.</p>';
                return;
            }

            // 2. Fetch product images
            const { data: images, error: imageError } = await supabaseClient
                .from('product_images')
                .select('image_url')
                .eq('product_id', productId);

            // 3. Populate the page
            document.title = `${product.name} - Creative Engine Asset Store`;
            document.querySelector('.product-title').textContent = product.name;
            document.querySelector('.product-author a').textContent = (product.profiles ? product.profiles.username : 'Vendedor Desconocido') || 'Vendedor Desconocido';
            document.querySelector('.product-price').textContent = product.price === 0 ? 'Gratis' : `\$${product.price.toFixed(2)}`;

            // --- Carga de Rating (separada y tolerante a fallos) ---
            const { data: ratingData, error: ratingError } = await supabaseClient
                .from('products_with_ratings')
                .select('average_rating, rating_count')
                .eq('id', productId)
                .single();

            if (ratingError) {
                console.warn(`No se pudo cargar el rating para el producto ${productId}.`, ratingError);
            } else if (ratingData && ratingData.rating_count > 0) {
                const ratingSummaryEl = document.getElementById('product-rating-summary');
                const starsHTML = renderStars(ratingData.average_rating);
                ratingSummaryEl.innerHTML = `<span class="stars">${starsHTML}</span> (${ratingData.rating_count} ${ratingData.rating_count === 1 ? 'voto' : 'votos'})`;
            }
            // --- Fin de la carga de Rating ---
            document.querySelector('.product-description').innerHTML = `<h2>Descripción</h2><p>${product.description.replace(/\n/g, '<br>')}</p>`;

            const mainMediaContainer = document.querySelector('.main-media');
            const thumbnailGallery = document.querySelector('.thumbnail-gallery');
            thumbnailGallery.innerHTML = ''; // Clear placeholders

            let mediaItems = [];
            if (images && images.length > 0) {
                mediaItems = images.map(img => ({ type: 'image', url: img.image_url }));
            }
            if (product.youtube_url) {
                mediaItems.unshift({ type: 'video', url: product.youtube_url });
            }

            function displayMedia(media) {
                if (media.type === 'image') {
                    mainMediaContainer.innerHTML = `<img src="${media.url}" alt="${product.name}">`;
                } else if (media.type === 'video') {
                    const videoId = media.url.split('v=')[1]?.split('&')[0] || media.url.split('/').pop();
                    mainMediaContainer.innerHTML = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                }
            }

            if (mediaItems.length > 0) {
                displayMedia(mediaItems[0]);

                mediaItems.forEach((media, index) => {
                    const thumb = document.createElement('img');
                    thumb.classList.add('thumbnail');
                    if (index === 0) thumb.classList.add('active');

                    if (media.type === 'image') {
                        thumb.src = media.url;
                    } else {
                        const videoId = media.url.split('v=')[1]?.split('&')[0] || media.url.split('/').pop();
                        thumb.src = `https://img.youtube.com/vi/${videoId}/0.jpg`;
                    }

                    thumb.addEventListener('click', () => {
                        displayMedia(media);
                        document.querySelectorAll('.thumbnail.active').forEach(t => t.classList.remove('active'));
                        thumb.classList.add('active');
                    });
                    thumbnailGallery.appendChild(thumb);
                });
            } else {
                 mainMediaContainer.innerHTML = `<img src="https://via.placeholder.com/560x315.png?text=No+Media" alt="No media available">`;
            }

            const buyPointsBtn = document.querySelector('.btn-buy-points');
            const getFreeBtn = document.querySelector('.btn-get-free');
            const wishlistBtn = document.querySelector('.wishlist-btn-large');
            const paypalContainer = document.getElementById('paypal-button-container');

            buyPointsBtn.dataset.productId = product.id;
            buyPointsBtn.dataset.price = product.price;
            getFreeBtn.dataset.productId = product.id;
            wishlistBtn.dataset.productId = product.id;

            buyPointsBtn.textContent = `Comprar (${product.price * 100} Puntos)`;

            if (product.price === 0) {
                paypalContainer.style.display = 'none';
                buyPointsBtn.style.display = 'none';
                getFreeBtn.style.display = 'inline-block';
            } else {
                 paypalContainer.style.display = 'block';
                 buyPointsBtn.style.display = 'inline-block';
                 getFreeBtn.style.display = 'none';
            }

            // Cargar comentarios y configurar formulario
            await loadProductComments(productId);
            await configureCommentForm(productId);
        }

        // --- Lógica de Comentarios y Votación ---

        async function configureCommentForm(productId) {
            const commentForm = document.getElementById('comment-form');
            if (!commentForm) return;

            const { data: { user } } = await supabaseClient.auth.getUser();

            if (!user) {
                // Deshabilitar para usuarios no logueados
                commentForm.querySelector('textarea').disabled = true;
                commentForm.querySelector('button').disabled = true;
                const ratingInput = document.getElementById('rating-input');
                if(ratingInput) ratingInput.innerHTML = '<p class="auth-notice">Debes <a href="login.html">iniciar sesión</a> y poseer este producto para calificarlo.</p>';
                return;
            }

            // Comprobar si el usuario posee el asset
            const { data: ownedAsset, error } = await supabaseClient
                .from('user_owned_assets')
                .select('id')
                .eq('user_id', user.id)
                .eq('product_id', productId)
                .maybeSingle();

            if (error) {
                console.error("Error checking asset ownership:", error);
                return;
            }

            if (!ownedAsset) {
                // Si no es propietario, oculta el formulario y muestra un mensaje.
                commentForm.style.display = 'none';
                const notice = document.createElement('p');
                notice.className = 'auth-notice';
                notice.innerHTML = 'Debes poseer este producto para poder calificarlo.';
                // Insertar el mensaje después del formulario (o en un contenedor específico si existe)
                commentForm.parentNode.insertBefore(notice, commentForm.nextSibling);

            } else {
                // Si es propietario, asegúrate de que el formulario esté visible y renderiza las estrellas.
                commentForm.style.display = 'block';
                const ratingInput = document.getElementById('rating-input');
                if (ratingInput) {
                    let starsHTML = '';
                    for (let i = 5; i >= 1; i--) {
                        starsHTML += `<input type="radio" id="star${i}" name="rating" value="${i}" /><label for="star${i}">★</label>`;
                    }
                    ratingInput.innerHTML = starsHTML;
                }
            }
        }

        async function loadProductComments(productId) {
            const commentsContainer = document.getElementById('comments-section');
            if (!commentsContainer) return;

            const commentsList = document.getElementById('comments-list');
            if(!commentsList) return;

            const { data: comments, error } = await supabaseClient
                .from('comments_with_details') // Usamos la vista
                .select('*')
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading comments:', error);
                commentsList.innerHTML = '<p class="error">No se pudieron cargar los comentarios.</p>';
                return;
            }

            renderComments(comments);
        }

        function renderComments(comments) {
            const commentsList = document.getElementById('comments-list');
            if (!commentsList) return;

            if (!comments || comments.length === 0) {
                commentsList.innerHTML = '<li><p>Todavía no hay comentarios. ¡Sé el primero!</p></li>';
                return;
            }

            const commentHTML = comments.map(comment => `
                <li class="comment ${comment.comment_type || ''}" data-comment-id="${comment.id}">
                    <div class="comment-author">${comment.author_username || 'Anónimo'}</div>
                    <div class="comment-body"><p>${(comment.content || '').replace(/\n/g, '<br>')}</p></div>
                    <div class="comment-footer">
                        <div class="comment-votes">
                            <button class="comment-vote-btn" data-vote-type="upvote" title="Útil">
                                👍 <span class="upvote-count">${comment.upvotes || 0}</span>
                            </button>
                            <button class="comment-vote-btn" data-vote-type="downvote" title="No útil">
                                👎 <span class="downvote-count">${comment.downvotes || 0}</span>
                            </button>
                            <button class="comment-vote-btn" data-vote-type="support" title="¡Gracias!">
                                ❤️ <span class="support-count">${comment.supports || 0}</span>
                            </button>
                        </div>
                        <div class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</div>
                    </div>
                </li>
            `).join('');

            commentsList.innerHTML = commentHTML;
        }

        const commentForm = document.getElementById('comment-form');
        if (commentForm) {
            commentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (!user) {
                    alert('Debes iniciar sesión para calificar.');
                    return;
                }

                const urlParams = new URLSearchParams(window.location.search);
                const productId = urlParams.get('id');
                const comment = document.getElementById('comment-body').value;
                const ratingInput = document.querySelector('input[name="rating"]:checked');
                const rating = ratingInput ? parseInt(ratingInput.value) : null;
                const commentTypeInput = document.querySelector('input[name="comment_type"]:checked');
                const commentType = commentTypeInput ? commentTypeInput.value : 'positive'; // Default a 'positive'

                if (!rating && !comment.trim()) {
                    alert('Debes seleccionar una calificación o escribir un comentario para publicar.');
                    return;
                }

                try {
                    const { data, error } = await supabaseClient.functions.invoke('submit-review', {
                        body: {
                            productId,
                            rating,
                            comment,
                            commentType,
                        },
                    });

                    if (error) throw error;
                    if (data.error) throw new Error(data.error);

                    alert('¡Gracias por tu reseña!');

                    // Limpiar y recargar para mostrar los cambios
                    document.getElementById('comment-body').value = '';
                    if (ratingInput) ratingInput.checked = false;
                    loadProductDetails();

                } catch (error) {
                    console.error("Error submitting review via Edge Function:", error);
                    alert('Error al publicar tu reseña: ' + error.message);
                }
            });
        }

        const commentsList = document.getElementById('comments-list');
        if (commentsList) {
            commentsList.addEventListener('click', async (e) => {
                const voteButton = e.target.closest('.comment-vote-btn');
                if (!voteButton) return;

                const { data: { user } } = await supabaseClient.auth.getUser();
                if (!user) {
                    alert('Debes iniciar sesión para votar.');
                    return;
                }

                const commentLi = voteButton.closest('.comment');
                const commentId = commentLi.dataset.commentId;
                const voteType = voteButton.dataset.voteType;

                voteButton.disabled = true;

                try {
                    const { data, error } = await supabaseClient.functions.invoke('vote-comment', {
                        body: { commentId: commentId, voteType },
                    });

                    if (error) throw error;
                    if (data.error) throw new Error(data.error);

                    if (data.newCounts) {
                        const upvoteSpan = commentLi.querySelector('.upvote-count');
                        const downvoteSpan = commentLi.querySelector('.downvote-count');
                        const supportSpan = commentLi.querySelector('.support-count');

                        if(upvoteSpan) upvoteSpan.textContent = data.newCounts.upvotes || 0;
                        if(downvoteSpan) downvoteSpan.textContent = data.newCounts.downvotes || 0;
                        if(supportSpan) supportSpan.textContent = data.newCounts.supports || 0;
                    }

                } catch (err) {
                    alert(`Error al procesar el voto: ${err.message}`);
                    console.error(err);
                } finally {
                    voteButton.disabled = false;
                }
            });
        }

        loadProductDetails();
    }
});

// --- Funciones de Ayuda ---

/**
 * Renderiza la calificación promedio como una serie de 5 estrellas.
 * @param {number} averageRating - La calificación promedio (ej. 4.5).
 * @returns {string} El HTML para las 5 estrellas.
 */
function renderStars(averageRating) {
    const rating = Math.round(averageRating * 2) / 2; // Redondear al 0.5 más cercano
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (rating >= i) {
            html += '★'; // Estrella llena
        } else if (rating === i - 0.5) {
            html += '◐'; // Media estrella (requiere un buen font)
        } else {
            html += '☆'; // Estrella vacía
        }
    }
    return html;
}

/**
 * Renderiza una sola estrella seguida del número total de calificaciones.
 * @param {number} ratingCount - El número total de calificaciones.
 * @returns {string} El HTML para el contador de estrellas.
 */
function renderStarCount(ratingCount) {
    if (ratingCount > 0) {
        return `★ ${ratingCount}`;
    }
    return ''; // No mostrar nada si no hay calificaciones
}
