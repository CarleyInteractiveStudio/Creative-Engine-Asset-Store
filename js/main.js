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

        // Lógica para mostrar/ocultar campos de licencia personalizada
        const licenseTypeSelect = document.getElementById('license-type');
        const customLicenseFields = document.getElementById('custom-license-fields');
        if (licenseTypeSelect && customLicenseFields) {
            licenseTypeSelect.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    customLicenseFields.style.display = 'block';
                } else {
                    customLicenseFields.style.display = 'none';
                }
            });
        }

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
            const licenseType = e.target['license-type'].value;
            const customSellerRights = e.target['custom-seller-rights'].value;
            const customBuyerRights = e.target['custom-buyer-rights'].value;
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

                // --- Generación del contenido de la licencia ---
                let licenseContent = `Licencia para: ${productName}\n`;
                licenseContent += `Tipo de Licencia: ${licenseType}\n\n`;

                switch (licenseType) {
                    case 'standard_paid':
                        licenseContent += "Términos: El comprador puede usar este asset en un número ilimitado de proyectos comerciales. No se requiere atribución al autor original.";
                        break;
                    case 'exclusive':
                        licenseContent += "Términos: Esta es una licencia de venta única. Una vez comprado, este producto se eliminará de la tienda. El comprador adquiere plenos derechos para usar, modificar y distribuir el asset en cualquier tipo de proyecto. El vendedor original renuncia a todos los derechos sobre el asset y se compromete a no revenderlo ni distribuirlo en ningún otro lugar.";
                        break;
                    case 'free_educational':
                        licenseContent += "Términos: Este asset puede ser utilizado libremente en proyectos personales y educativos. No está permitido su uso en proyectos comerciales. No se puede redistribuir el asset sin el permiso explícito del creador original.";
                        break;
                    case 'free_commercial':
                        licenseContent += "Términos: Este asset puede ser utilizado en proyectos comerciales y personales. Se requiere dar crédito/atribución al autor original del producto.";
                        break;
                    case 'custom':
                        licenseContent += `Derechos del Vendedor:\n${customSellerRights}\n\nDerechos del Comprador:\n${customBuyerRights}`;
                        break;
                }
                const licenseFile = new Blob([licenseContent], { type: 'text/plain' });
                const licenseFilePath = `${user.id}/${Date.now()}-licencia.txt`;

                // 1. Subir archivo de licencia
                overlayMessage.textContent = 'Subiendo licencia...';
                const { error: licenseFileError } = await supabaseClient.storage
                    .from('product_licenses')
                    .upload(licenseFilePath, licenseFile);
                if (licenseFileError) throw licenseFileError;

                // 2. Subir archivo principal
                overlayMessage.textContent = 'Subiendo archivo principal...';
                const mainFilePath = `${user.id}/${Date.now()}-${mainFile.name.replace(/\s+/g, '_')}`;
                const { error: mainFileError } = await supabaseClient.storage
                    .from('product_files')
                    .upload(mainFilePath, mainFile);
                if (mainFileError) throw mainFileError;

                // 3. Insertar en la tabla 'products'
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
                        main_file_url: mainFilePath,
                        license_file_path: licenseFilePath, // Guardar ruta de la licencia
                        license_type: licenseType,
                        custom_license_seller_rights: customSellerRights || null,
                        custom_license_buyer_rights: customBuyerRights || null,
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
            try {
                // 1. Obtener los productos ya ordenados desde la vista de la base de datos
                const { data: products, error } = await supabaseClient
                    .from('products_with_ratings')
                    .select('*')
                    .eq('status', 'approved')
                    .order('average_rating', { ascending: false })
                    .order('rating_count', { ascending: false })
                    .limit(8);

                if (error) throw error;

                if (!products || products.length === 0) {
                    featuredAssetGrid.innerHTML = '<p>No hay productos destacados en este momento.</p>';
                    return;
                }

                // 2. Renderizar los productos
                const productPromises = products.map(async (product) => {
                    const { data: images, error: imageError } = await supabaseClient
                        .from('product_images')
                        .select('image_url')
                        .eq('product_id', product.id)
                        .limit(1);

                    let imageUrl = 'https://via.placeholder.com/300x200.png?text=No+Image';
                    if (!imageError && images && images.length > 0) {
                        imageUrl = images[0].image_url;
                    }

                    const starsHTML = renderStars(product.average_rating);

                    return `
                        <a href="product.html?id=${product.id}" class="asset-card">
                            <button class="wishlist-btn" data-product-id="${product.id}">❤️</button>
                            <img src="${imageUrl}" alt="${product.name}" class="asset-image">
                            <div class="asset-info">
                                <h3 class="asset-title">${product.name}</h3>
                                <div class="asset-rating-summary">
                                    <span class="stars">${starsHTML}</span>
                                    <span class="rating-count">(${product.rating_count})</span>
                                </div>
                                <p class="asset-price">${product.price === 0 ? 'Gratis' : `\$${product.price.toFixed(2)}`}</p>
                            </div>
                        </a>
                    `;
                });

                const productHTML = await Promise.all(productPromises);
                featuredAssetGrid.innerHTML = productHTML.join('');

            } catch (error) {
                 console.error('Error cargando productos destacados:', error);
                featuredAssetGrid.innerHTML = '<p class="error">No se pudieron cargar los productos destacados.</p>';
            }
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
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const categorySlug = urlParams.get('category');
                const sortBy = urlParams.get('sort') || 'created_at'; // Default sort
                const sortOrder = urlParams.get('order') || 'desc';

                const categoryTitleElement = document.querySelector('.category-title');

                let query = supabaseClient.from('products_with_ratings').select('*').eq('status', 'approved');

                if (categorySlug) {
                    const { data: category, error: categoryError } = await supabaseClient.from('categories').select('id, name').eq('slug', categorySlug).single();
                    if (categoryError || !category) {
                        console.error('Error: No se encontró la categoría:', categorySlug);
                        categoryAssetGrid.innerHTML = '<p>La categoría especificada no existe.</p>';
                        return;
                    }
                    query = query.eq('category_id', category.id);
                    if (categoryTitleElement) categoryTitleElement.textContent = category.name;
                } else {
                    if (categoryTitleElement) categoryTitleElement.textContent = 'Todos los Productos';
                }

                // Aplicar ordenamiento
                const orderOptions = { ascending: sortOrder === 'asc' };
                if (sortBy === 'average_rating') {
                    query = query.order('average_rating', orderOptions).order('rating_count', { ascending: false });
                } else {
                    query = query.order(sortBy, orderOptions);
                }

                const { data: products, error } = await query;

                if (error) throw error;

                if (!products || products.length === 0) {
                    categoryAssetGrid.innerHTML = '<p>No hay productos que coincidan con los filtros seleccionados.</p>';
                    return;
                }

                const productPromises = products.map(async (product) => {
                    const { data: images, error: imageError } = await supabaseClient.from('product_images').select('image_url').eq('product_id', product.id).limit(1);
                    let imageUrl = 'https://via.placeholder.com/300x200.png?text=No+Image';
                    if (!imageError && images && images.length > 0) imageUrl = images[0].image_url;

                    const starsHTML = renderStars(product.average_rating);

                    return `
                        <a href="product.html?id=${product.id}" class="asset-card">
                            <button class="wishlist-btn" data-product-id="${product.id}">❤️</button>
                            <img src="${imageUrl}" alt="${product.name}" class="asset-image">
                            <div class="asset-info">
                                <h3 class="asset-title">${product.name}</h3>
                                <div class="asset-rating-summary">
                                    <span class="stars">${starsHTML}</span>
                                    <span class="rating-count">(${product.rating_count})</span>
                                </div>
                                <p class="asset-price">${product.price === 0 ? 'Gratis' : `\$${product.price.toFixed(2)}`}</p>
                            </div>
                        </a>
                    `;
                });

                const productHTML = await Promise.all(productPromises);
                categoryAssetGrid.innerHTML = productHTML.join('');

            } catch (error) {
                console.error('Error cargando productos de categoría:', error);
                categoryAssetGrid.innerHTML = '<p class="error">No se pudieron cargar los productos.</p>';
            }
        }
        loadCategoryProducts();

        // Lógica para el control de ordenamiento
        const sortControl = document.getElementById('sort-by');
        if (sortControl) {
            sortControl.addEventListener('change', () => {
                const [sortBy, sortOrder] = sortControl.value.split(':');
                const urlParams = new URLSearchParams(window.location.search);
                urlParams.set('sort', sortBy);
                urlParams.set('order', sortOrder);
                window.location.search = urlParams.toString();
            });

            // Establecer el valor actual del select basado en la URL
            const urlParams = new URLSearchParams(window.location.search);
            const currentSort = urlParams.get('sort') || 'created_at';
            const currentOrder = urlParams.get('order') || 'desc';
            sortControl.value = `${currentSort}:${currentOrder}`;
        }
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
                            <div class="my-assets-actions">
                                <button class="btn btn-primary download-btn" data-product-id="${product.id}">Descargar Producto</button>
                                ${product.license_file_path ? `<button class="btn btn-secondary download-license-btn" data-license-path="${product.license_file_path}">Descargar Licencia</button>` : ''}
                            </div>
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

    // --- FUNCIÓN PRINCIPAL PARA CARGAR LA PÁGINA DEL PRODUCTO ---
    async function loadProductDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (!productId) {
            document.querySelector('.container').innerHTML = '<h1>Producto no encontrado</h1><p>El ID del producto no se encontró en la URL.</p>';
            return;
        }

        try {
            // 1. Obtener datos del producto y del usuario simultáneamente
            const [
                { data: product, error: productError },
                { data: { session }, error: sessionError }
            ] = await Promise.all([
                supabaseClient.from('products_with_ratings').select('*, profiles(username)').eq('id', productId).single(),
                supabaseClient.auth.getSession()
            ]);

            if (productError) throw productError;
            if (!product) {
                document.querySelector('.container').innerHTML = '<p>Producto no encontrado.</p>';
                return;
            }

            // 2. Renderizar la información básica del producto
            document.title = `${product.name} - Creative Engine Asset Store`;
            document.querySelector('.product-title').textContent = product.name;
            document.querySelector('.product-author a').textContent = product.profiles.username || 'Desconocido';
            document.querySelector('.product-price').textContent = product.price > 0 ? `\$${product.price.toFixed(2)}` : 'Gratis';
            document.querySelector('.product-description').innerHTML = `<h2>Descripción</h2><p>${product.description.replace(/\n/g, '<br>')}</p>`;

            // --- Renderizar detalles de la licencia ---
            const licenseDetailsContainer = document.getElementById('license-details');
            licenseDetailsContainer.innerHTML = renderLicenseDetails(product);

            // Renderizar estrellas de calificación promedio
            const averageRatingEl = document.getElementById('product-average-rating');
            averageRatingEl.innerHTML = renderStars(product.average_rating) + ` (${product.rating_count} reseña${product.rating_count === 1 ? '' : 's'})`;

            // 3. Cargar media
            const { data: images, error: imageError } = await supabaseClient.from('product_images').select('image_url').eq('product_id', productId);
            const mainMediaContainer = document.querySelector('.main-media');
            const thumbnailGallery = document.querySelector('.thumbnail-gallery');
            thumbnailGallery.innerHTML = '';

            let mediaItems = (images || []).map(img => ({ type: 'image', url: img.image_url }));
            if (product.youtube_url) mediaItems.unshift({ type: 'video', url: product.youtube_url });

            function displayMedia(media) {
                if (media.type === 'image') mainMediaContainer.innerHTML = `<img src="${media.url}" alt="${product.name}">`;
                else {
                    const videoId = media.url.split('v=')[1]?.split('&')[0] || media.url.split('/').pop();
                    mainMediaContainer.innerHTML = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
                }
            }

            if (mediaItems.length > 0) {
                displayMedia(mediaItems[0]);
                mediaItems.forEach((media, index) => {
                    const thumb = document.createElement('img');
                    thumb.className = 'thumbnail';
                    if (index === 0) thumb.classList.add('active');
                    if (media.type === 'image') thumb.src = media.url;
                    else {
                        const videoId = media.url.split('v=')[1]?.split('&')[0] || media.url.split('/').pop();
                        thumb.src = `https://img.youtube.com/vi/${videoId}/0.jpg`;
                    }
                    thumb.onclick = () => {
                        displayMedia(media);
                        document.querySelectorAll('.thumbnail.active').forEach(t => t.classList.remove('active'));
                        thumb.classList.add('active');
                    };
                    thumbnailGallery.appendChild(thumb);
                });
            } else mainMediaContainer.innerHTML = `<img src="https://via.placeholder.com/560x315.png?text=No+Media" alt="No media available">`;

            // 4. Configurar botones de acción
            const { data: { user } } = await supabaseClient.auth.getUser();
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

            // 5. Lógica de calificaciones y comentarios
            const reviewSection = document.getElementById('review-section');
            if (session) {
                const { data: ownership } = await supabaseClient.from('user_owned_assets').select('id').eq('user_id', user.id).eq('product_id', productId).maybeSingle();
                if (ownership) {
                    reviewSection.style.display = 'block';
                    initializeReviewForm(productId, user);
                } else {
                    reviewSection.style.display = 'none';
                }
            } else {
                reviewSection.style.display = 'none';
            }

            // 6. Cargar y mostrar los comentarios existentes
            await loadComments(productId, session ? session.user : null);

        } catch (error) {
            console.error('Error cargando detalles del producto:', error);
            document.querySelector('.container').innerHTML = `<p>Error al cargar el producto: ${error.message}</p>`;
        }
    }

    loadProductDetails();
}

// --- NUEVAS FUNCIONES PARA CALIFICACIONES Y COMENTARIOS ---

// Función para renderizar estrellas (visualización y formulario)
function renderStars(rating) {
    let starsHtml = '';
    const fullStars = Math.round(rating); // Redondeamos para visualización simple
    for (let i = 1; i <= 5; i++) {
        starsHtml += `<span data-value="${i}">${i <= fullStars ? '★' : '☆'}</span>`;
    }
    return starsHtml;
}

function setupInteractiveStars(targetElement) {
    targetElement.innerHTML = renderStars(0); // Empezar con 0 estrellas
    const stars = targetElement.querySelectorAll('span');

    const handleStarHover = (rating) => {
        stars.forEach(star => {
            star.textContent = parseInt(star.dataset.value) <= rating ? '★' : '☆';
        });
    };

    stars.forEach(star => {
        star.addEventListener('mouseover', () => handleStarHover(parseInt(star.dataset.value)));
        star.addEventListener('mouseout', () => handleStarHover(parseInt(targetElement.dataset.rating || '0')));
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.value);
            targetElement.dataset.rating = rating; // Guardar la calificación seleccionada
            handleStarHover(rating);
        });
    });
}

// Función para inicializar el formulario de reseña
function initializeReviewForm(productId, user) {
    const form = document.getElementById('review-form');
    const starsContainer = document.getElementById('user-rating-stars');
    const commentTypeSelector = document.querySelector('.comment-type-selector');
    let selectedCommentType = null;

    setupInteractiveStars(starsContainer);

    commentTypeSelector.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            commentTypeSelector.querySelectorAll('.btn').forEach(btn => btn.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedCommentType = e.target.dataset.type;
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rating = parseInt(starsContainer.dataset.rating || '0');
        const comment = document.getElementById('comment-text').value;

        if (rating === 0 && !comment.trim()) {
            alert("Por favor, selecciona una calificación o escribe un comentario.");
            return;
        }
        if (comment.trim() && !selectedCommentType) {
            alert("Por favor, selecciona si tu comentario es positivo o negativo.");
            return;
        }

        try {
            const { data, error } = await supabaseClient.functions.invoke('submit-review', {
                body: {
                    productId,
                    rating: rating > 0 ? rating : null,
                    comment: comment.trim() || null,
                    commentType: selectedCommentType
                }
            });

            if (error) throw error;
            if(data.error) throw new Error(data.error);

            alert("¡Reseña enviada con éxito!");
            location.reload();


        } catch (error) {
            console.error('Error al enviar la reseña:', error);
            alert(`Error: ${error.message}`);
        }
    });
}

// Función para cargar y mostrar los comentarios
async function loadComments(productId, user) {
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = '<p>Cargando comentarios...</p>';

    try {
        // 1. Obtener los comentarios desde la nueva vista
        const { data: comments, error: commentsError } = await supabaseClient
            .from('comments_with_details')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (commentsError) throw commentsError;

        if (comments.length === 0) {
            commentsList.innerHTML = '<p>Todavía no hay comentarios. ¡Sé el primero!</p>';
            return;
        }

        // 2. Si el usuario está logueado, obtener sus votos para marcar los botones correctos
        let userVotes = new Map();
        if (user) {
            const commentIds = comments.map(c => c.id);
            const { data: votesData, error: votesError } = await supabaseClient
                .from('comment_votes')
                .select('comment_id, vote_type')
                .in('comment_id', commentIds)
                .eq('user_id', user.id);

            if (votesError) console.warn("No se pudieron cargar los votos del usuario:", votesError);
            else votesData.forEach(vote => userVotes.set(vote.comment_id, vote.vote_type));
        }

        // 3. Renderizar el HTML
        const commentsHtml = comments.map(comment => {
            const userVote = userVotes.get(comment.id);
            return `
                <div class="comment-card ${comment.comment_type}">
                    <div class="comment-header">
                        <span class="comment-author">${comment.author_username || 'Anónimo'}</span>
                        <span class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                    <p class="comment-body">${comment.content}</p>
                    <div class="comment-actions" data-comment-id="${comment.id}">
                        <button class="vote-btn ${userVote === 'upvote' ? 'active' : ''}" data-vote-type="upvote">👍 <span>${comment.upvotes}</span></button>
                        <button class="vote-btn ${userVote === 'downvote' ? 'active' : ''}" data-vote-type="downvote">👎 <span>${comment.downvotes}</span></button>
                        <button class="vote-btn ${userVote === 'support' ? 'active' : ''}" data-vote-type="support">🤝 <span>${comment.supports}</span> Apoyo</button>
                    </div>
                </div>
            `;
        }).join('');
        commentsList.innerHTML = commentsHtml;

    } catch (error) {
        console.error('Error al cargar comentarios:', error);
        commentsList.innerHTML = `<p>Error al cargar comentarios: ${error.message}</p>`;
    }
}

// Listener para votos en comentarios (delegado)
document.addEventListener('click', async (e) => {
    const voteButton = e.target.closest('.vote-btn');
    if (!voteButton || !window.location.pathname.includes('product.html')) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("Debes iniciar sesión para votar.");
        return;
    }

    const commentId = voteButton.parentElement.dataset.commentId;
    const voteType = voteButton.dataset.voteType;

    try {
        const { error } = await supabaseClient.functions.invoke('vote-comment', {
            body: { commentId, voteType }
        });
        if (error) throw error;

        // Recargar todo para actualizar los votos
        location.reload();
    } catch (error) {
        console.error('Error al votar:', error);
        alert(`Error: ${error.message}`);
    }
});

// --- Nueva Función para Renderizar Detalles de la Licencia ---
function renderLicenseDetails(product) {
    let licenseHTML = '';
    const licenseType = product.license_type;

    switch (licenseType) {
        case 'standard_paid':
            licenseHTML = `
                <h4>De Pago (Uso Comercial Ilimitado)</h4>
                <p>Puedes usar este asset en un número ilimitado de proyectos comerciales. No se requiere atribución al autor original.</p>
            `;
            break;
        case 'exclusive':
            licenseHTML = `
                <h4>Exclusiva (Venta Única)</h4>
                <p>Al comprar este producto, adquieres los derechos exclusivos. Será retirado de la tienda permanentemente. Puedes usarlo, modificarlo y distribuirlo en cualquier proyecto sin restricciones.</p>
            `;
            break;
        case 'free_educational':
            licenseHTML = `
                <h4>Gratuita (Uso Educativo)</h4>
                <p>Puedes usar este asset libremente en proyectos personales y educativos. No está permitido su uso en proyectos comerciales ni su redistribución sin el permiso explícito del creador.</p>
            `;
            break;
        case 'free_commercial':
            licenseHTML = `
                <h4>Gratuita (Uso Comercial con Atribución)</h4>
                <p>Puedes usar este asset en proyectos comerciales y personales, pero debes dar crédito (atribución) al autor original del producto.</p>
            `;
            break;
        case 'custom':
            licenseHTML = `
                <h4>Personalizada</h4>
                <p>Esta licencia tiene términos especiales definidos por el vendedor.</p>
                <h5>Derechos del Vendedor:</h5>
                <p>${product.custom_license_seller_rights || 'No especificados.'}</p>
                <h5>Derechos del Comprador:</h5>
                <p>${product.custom_license_buyer_rights || 'No especificados.'}</p>
            `;
            break;
        default:
            licenseHTML = '<p>Licencia no especificada.</p>';
            break;
    }
    return licenseHTML;
}

// --- Nueva Lógica para Descargar la Licencia ---
document.body.addEventListener('click', async (e) => {
    const button = e.target.closest('.download-license-btn');
    if (!button) return;

    const licensePath = button.dataset.licensePath;
    if (!licensePath) {
        alert('Error: No se encontró la ruta de la licencia.');
        return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Generando...';

    try {
        const { data, error } = await supabaseClient.functions.invoke('create-license-download-link', {
            body: { licensePath },
        });

        if (error) throw new Error(`Error de la función: ${error.message}`);
        if (data.error) throw new Error(data.error);
        if (!data.signedUrl) throw new Error("No se recibió un enlace de descarga válido.");

        // Iniciar la descarga
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = 'licencia.txt'; // Nombre del archivo que verá el usuario
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        console.error('Error al descargar la licencia:', err);
        alert(`No se pudo generar el enlace de descarga: ${err.message}`);
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
});

});
