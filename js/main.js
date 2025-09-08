// Scripts para la Creative Engine Asset Store

// Advertencia para el desarrollador sobre la configuración de PayPal
if (document.querySelector('script[src*="YOUR_SANDBOX_CLIENT_ID"]')) {
    console.warn("ADVERTENCIA: El SDK de PayPal está usando un Client ID de prueba. Reemplaza 'YOUR_SANDBOX_CLIENT_ID' en product.html para que los pagos funcionen.");
}

// Initialize the Supabase client
const { createClient } = supabase;
const supabaseUrl = 'https://tladrluezsmmhjbhupgb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsYWRybHVlenNtbWhqYmh1cGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY5NjQsImV4cCI6MjA3MTAwMjk2NH0.p7x3MPizmNdX57KzX5T4c15ytuH1oznjFqyp14HD-QU';

// Advertencia para el desarrollador si las claves no están configuradas
if (supabaseUrl === 'TU_SUPABASE_URL' || supabaseKey === 'TU_SUPABASE_KEY') {
    console.error("ADVERTENCIA: Las claves de Supabase no están configuradas en js/main.js. La aplicación no funcionará correctamente sin ellas. Reemplaza 'TU_SUPABASE_URL' y 'TU_SUPABASE_KEY' con tus claves reales.");
}

const supabaseClient = createClient(supabaseUrl, supabaseKey);

window.addEventListener('load', () => {
    console.log("Creative Engine Asset Store script cargado.");

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
                const isAdmin = user.user_metadata && user.user_metadata.is_admin;
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
            const userPoints = sessionStorage.getItem('user_points') || 0;
            const isAdmin = sessionStorage.getItem('is_admin') === 'true';
            console.log("DEBUG: En updateUserUI, valor de sessionStorage 'is_admin':", sessionStorage.getItem('is_admin'));
            console.log("DEBUG: En updateUserUI, la variable 'isAdmin' es:", isAdmin);

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

        // Añadir listener al botón de logout si existe
        const logoutButton = document.getElementById('logout-btn');
        if (logoutButton) {
            logoutButton.addEventListener('click', async (e) => {
                e.preventDefault();
                await supabaseClient.auth.signOut();
                // onAuthStateChange se encargará de recargar la UI
            });
        }
    }

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
            sessionStorage.removeItem('user_points');
            sessionStorage.removeItem('is_admin');
            updateUserUI(null);
        } else if (session?.user) {
            // On page load, check for admin status in metadata and store it
            const user = session.user;
            const isAdmin = user.user_metadata && user.user_metadata.is_admin;
            sessionStorage.setItem('is_admin', isAdmin || false);
            console.log("DEBUG: 'is_admin' from metadata on auth change:", isAdmin);

            // Fetch points if not already in session storage
            if (sessionStorage.getItem('user_points') === null) {
                const { data: profile, error } = await supabaseClient
                    .from('profiles')
                    .select('points')
                    .eq('id', user.id)
                    .single();
                if (!error && profile) {
                    sessionStorage.setItem('user_points', profile.points);
                }
            }
            updateUserUI(session.user);
        } else {
            updateUserUI(null);
        }
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
                const mainFilePath = `${user.id}/${timestamp}-${mainFile.name}`;
                const { error: mainFileError } = await supabaseClient.storage
                    .from('product_files')
                    .upload(mainFilePath, mainFile);
                if (mainFileError) throw mainFileError;

                const { data: { publicUrl: mainFileUrl } } = supabaseClient.storage.from('product_files').getPublicUrl(mainFilePath);

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
                        main_file_url: mainFileUrl,
                        status: 'pending'
                    })
                    .select()
                    .single();
                if (productError) throw productError;

                // 3. Subir imágenes y guardar en 'product_images'
                for (let i = 0; i < images.length; i++) {
                    const image = images[i];
                    overlayMessage.textContent = `Subiendo imagen ${i + 1} de ${images.length}...`;
                    const imagePath = `${user.id}/${productData.id}/${image.name}`;
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

            // --- Cargar Resumen de Ganancias (Simulado) ---
            const earningsDiv = document.getElementById('earnings-data');
            // Simular ventas para este usuario
            const simulatedSales = [
                { price: 10.00 }, { price: 25.00 }, { price: 5.00 }, { price: 12.00 }
            ];
            const totalRevenue = simulatedSales.reduce((sum, sale) => sum + sale.price, 0);
            let commissionRate = 0.10;
            if (totalRevenue > 500) {
                commissionRate = 0.20;
            } else if (totalRevenue > 100) {
                commissionRate = 0.15;
            }
            const commissionAmount = totalRevenue * commissionRate;
            const netPayout = totalRevenue - commissionAmount;

            earningsDiv.innerHTML = `
                <div class="earning-item">Ingresos Totales: <strong>\$${totalRevenue.toFixed(2)}</strong></div>
                <div class="earning-item">Comisión de la Tienda (${commissionRate * 100}%): <strong>-\$${commissionAmount.toFixed(2)}</strong></div>
                <div class="earning-item">Pago Neto Estimado: <strong>\$${netPayout.toFixed(2)}</strong></div>
                <div class="earning-item">Próximo Día de Pago: <strong>Fin de mes</strong></div>
            `;


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

            if (products.length === 0) {
                productListDiv.innerHTML = '<p>No has subido ningún producto todavía.</p>';
                return;
            }

            let productHTML = '<ul>';
            for (const product of products) {
                productHTML += `<li>${product.name} - <strong>Estado:</strong> ${product.status}</li>`;
            }
            productHTML += '</ul>';
            productListDiv.innerHTML = productHTML;
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

            // 2. Ingresos (simulado)
            const totalRevenue = 12540.50;
            const monthlySales = 1850.75;
            document.getElementById('stats-total-revenue').textContent = `\$${totalRevenue.toFixed(2)}`;
            document.getElementById('stats-monthly-sales').textContent = `\$${monthlySales.toFixed(2)}`;
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

            let productHTML = '';
            for (const product of products) {
                productHTML += `
                    <div class="pending-product-item" id="product-${product.id}">
                        <div class="pending-product-info">
                            <h3>${product.name}</h3>
                            <p>Vendedor: ${product.profiles.username || 'N/A'} | Precio: \$${product.price.toFixed(2)}</p>
                        </div>
                        <div class="pending-product-actions">
                            <button class="btn btn-primary approve-btn" data-id="${product.id}">Aprobar</button>
                            <button class="btn btn-secondary reject-btn" data-id="${product.id}">Rechazar</button>
                        </div>
                    </div>
                `;
            }
            pendingProductsList.innerHTML = productHTML;
        }

        // Lógica para los botones de Aprobar/Rechazar y el modal
        const modal = document.getElementById('rejection-modal');
        const closeModalBtn = modal.querySelector('.close-btn');
        const submitRejectionBtn = modal.querySelector('#submit-rejection-btn');
        const rejectionReasonText = modal.querySelector('#rejection-reason-text');
        let currentRejectingProductId = null;

        closeModalBtn.addEventListener('click', () => modal.style.display = 'none');

        async function handleApproval(productId) {
            const { error } = await supabaseClient.from('products').update({ status: 'approved' }).eq('id', productId);
            if (error) {
                alert('Error al aprobar el producto.');
                console.error(error);
            } else {
                document.getElementById(`product-${productId}`).remove();
                // Aquí llamaríamos a la Edge Function de notificación
                supabaseClient.functions.invoke('send-product-status-email', { body: { productId: productId, status: 'approved' } });
            }
        }

        async function handleRejection(productId, reason) {
            const { error } = await supabaseClient.from('products').update({ status: 'rejected', rejection_reason: reason }).eq('id', productId);
             if (error) {
                alert('Error al rechazar el producto.');
                console.error(error);
            } else {
                modal.style.display = 'none';
                document.getElementById(`product-${productId}`).remove();
                // Aquí llamaríamos a la Edge Function de notificación
                supabaseClient.functions.invoke('send-product-status-email', { body: { productId: productId, status: 'rejected', reason: reason } });
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
                .limit(4);

            if (error) {
                console.error('Error cargando productos destacados:', error);
                return;
            }

            let productHTML = '';
            for (const product of products) {
                 productHTML += `
                    <div class="asset-card">
                        <button class="wishlist-btn" data-product-id="${product.id}">❤️</button>
                        <img src="https://via.placeholder.com/300x200.png?text=${product.name}" alt="${product.name}" class="asset-image">
                        <div class="asset-info">
                            <h3 class="asset-title">${product.name}</h3>
                            <p class="asset-price">${product.price === 0 ? 'Gratis' : `\$${product.price.toFixed(2)}`}</p>
                        </div>
                    </div>
                `;
            }
            featuredAssetGrid.innerHTML = productHTML || '<p>No hay productos destacados en este momento.</p>';
        }
        loadFeaturedProducts();
    }

    // Lógica para cargar productos en la página de categoría
    const categoryAssetGrid = document.querySelector('.category-content .asset-grid');
    if (categoryAssetGrid) {
        async function loadCategoryProducts() {
            // NOTA: En una app real, aquí se obtendría la categoría de la URL
            // y se filtraría por ella. Por ahora, cargamos todos los aprobados.
            const { data: products, error } = await supabaseClient
                .from('products')
                .select('*')
                .eq('status', 'approved');

            if (error) {
                console.error('Error cargando productos de categoría:', error);
                return;
            }

            let productHTML = '';
            for (const product of products) {
                 productHTML += `
                    <div class="asset-card">
                        <button class="wishlist-btn" data-product-id="${product.id}">❤️</button>
                        <img src="https://via.placeholder.com/300x200.png?text=${product.name}" alt="${product.name}" class="asset-image">
                        <div class="asset-info">
                            <h3 class="asset-title">${product.name}</h3>
                            <p class="asset-price">${product.price === 0 ? 'Gratis' : `\$${product.price.toFixed(2)}`}</p>
                        </div>
                    </div>
                `;
            }
            categoryAssetGrid.innerHTML = productHTML || '<p>No hay productos en esta categoría.</p>';
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

            let productHTML = '';
            for (const product of products) {
                const suspendButtonText = product.is_suspended ? 'Rehabilitar' : 'Suspender';
                productHTML += `
                    <div class="pending-product-item" id="product-approved-${product.id}">
                        <div class="pending-product-info">
                            <h3>${product.name} ${product.is_suspended ? '(Suspendido)' : ''}</h3>
                            <p>Vendedor: ${product.profiles.username || 'N/A'}</p>
                        </div>
                        <div class="pending-product-actions">
                            <a href="edit-product.html?id=${product.id}" class="btn btn-secondary">Editar</a>
                            <button class="btn btn-secondary suspend-btn" data-id="${product.id}" data-suspended="${product.is_suspended}">${suspendButtonText}</button>
                            <button class="btn btn-danger delete-btn" data-id="${product.id}">Borrar</button>
                        </div>
                    </div>
                `;
            }
            approvedProductsList.innerHTML = productHTML || '<p>No hay productos aprobados.</p>';
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
                    const { error } = await supabaseClient.from('products').delete().eq('id', id);
                    if (error) {
                        alert('Error al borrar el producto.');
                    } else {
                        document.getElementById(`product-approved-${id}`).remove();
                        // Notificar
                        supabaseClient.functions.invoke('send-product-status-email', { body: { productId: id, status: 'deleted' } });
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
                    try {
                        const { data, error } = await supabaseClient.functions.invoke('paypal-create-order', {
                            body: { productId },
                        });
                        if (error) throw new Error(error.message);
                        return data.orderID;
                    } catch (err) {
                        console.error('Error al crear la orden de PayPal:', err);
                        alert('No se pudo iniciar el proceso de pago. Inténtalo de nuevo.');
                    }
                },
                async onApprove(data) {
                    try {
                        const { data: responseData, error } = await supabaseClient.functions.invoke('paypal-capture-order', {
                            body: { orderID: data.orderID, productId },
                        });
                        if (error) throw new Error(error.message);

                        alert('¡Compra exitosa! El asset ha sido añadido a tu colección.');
                        window.location.href = 'my-assets.html';
                    } catch (err) {
                        console.error('Error al capturar el pago de PayPal:', err);
                        alert('Hubo un error al procesar tu pago. Por favor, contacta a soporte.');
                    }
                },
                onError(err) {
                    console.error('Error en el SDK de PayPal:', err);
                    alert('Ocurrió un error inesperado con PayPal. Por favor, recarga la página.');
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
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return;

            const newEmail = emailInput.value;
            const { error } = await supabaseClient
                .from('profiles')
                .update({ paypal_email: newEmail })
                .eq('id', user.id);

            if (error) {
                alert('Error al guardar la configuración.');
                console.error(error);
            } else {
                alert('¡Configuración de pago guardada exitosamente!');
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

            if (data.length === 0) {
                wishlistDiv.innerHTML = '<p>Tu lista de deseos está vacía.</p>';
                return;
            }

            let productHTML = '<div class="asset-grid">';
            for (const item of data) {
                const product = item.products;
                productHTML += `
                    <div class="asset-card">
                        <button class="wishlist-btn active" data-product-id="${product.id}">❤️</button>
                        <img src="https://via.placeholder.com/300x200.png?text=${product.name}" alt="${product.name}" class="asset-image">
                        <div class="asset-info">
                            <h3 class="asset-title">${product.name}</h3>
                            <p class="asset-price">${product.price === 0 ? 'Gratis' : `\$${product.price.toFixed(2)}`}</p>
                        </div>
                    </div>
                `;
            }
            productHTML += '</div>';
            wishlistDiv.innerHTML = productHTML;
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

            if (data.length === 0) {
                purchasedDiv.innerHTML = '<p>No has comprado u obtenido ningún asset todavía.</p>';
                return;
            }

            let productHTML = '<div class="asset-grid">';
            for (const item of data) {
                const product = item.products;
                productHTML += `
                    <div class="asset-card">
                        <img src="https://via.placeholder.com/300x200.png?text=${product.name}" alt="${product.name}" class="asset-image">
                        <div class="asset-info">
                            <h3 class="asset-title">${product.name}</h3>
                            <p class="asset-price">Obtenido</p>
                        </div>
                    </div>
                `;
            }
            productHTML += '</div>';
            purchasedDiv.innerHTML = productHTML;
        }

        loadPurchasedAssets();
    }

    // Lógica para mostrar el botón correcto en la página de producto
    const productActions = document.querySelector('.product-actions');
    if (productActions) {
        const buyButton = productActions.querySelector('.btn-buy');
        const freeButton = productActions.querySelector('.btn-get-free');
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

        const { error } = await supabaseClient
            .from('user_owned_assets')
            .insert({ user_id: user.id, product_id: productId, purchase_price: 0 });

        if (error) {
            console.error('Error al obtener el asset gratuito:', error);
            alert('Hubo un error al obtener el asset.');
        } else {
            alert('¡Asset añadido a tu colección!');
            button.textContent = 'En tu colección';
            button.disabled = true;
        }
    }

    document.body.addEventListener('click', handleGetFreeClick);

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

    // Lógica para simular ganar puntos
    const earnPointsBtn = document.getElementById('earn-points-btn');
    if(earnPointsBtn) {
        earnPointsBtn.addEventListener('click', async () => {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                alert('Debes iniciar sesión para ganar puntos.');
                return;
            }

            // En una DB real, esto se haría con una RPC para ser una operación atómica
            // Por ahora, leemos y luego escribimos.
            const { data: profile, error: fetchError } = await supabaseClient.from('profiles').select('points').eq('id', user.id).single();
            if(fetchError) {
                alert('Error al obtener tu perfil.');
                return;
            }

            const newPoints = profile.points + 5;
            const { error: updateError } = await supabaseClient.from('profiles').update({ points: newPoints }).eq('id', user.id);

            if(updateError) {
                alert('Error al añadir puntos.');
            } else {
                await supabaseClient.from('points_transactions').insert({ user_id: user.id, amount: 5, description: 'Vio un anuncio de prueba' });
                alert('¡Has ganado 5 puntos!');
                updateUserUI(user); // Actualizar la UI para mostrar el nuevo saldo
            }
        });
    }

    // --- Lógica de la Lista de Deseos ---
    async function handleWishlistClick(e) {
        const button = e.target.closest('.wishlist-btn, .wishlist-btn-large');
        if (!button) return;

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
});
