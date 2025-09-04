// Scripts para la Creative Engine Asset Store

// Initialize the Supabase client
const { createClient } = supabase;
const supabaseUrl = 'https://tladrluezsmmhjbhupgb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsYWRybHVlenNtbWhqYmh1cGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY5NjQsImV4cCI6MjA3MTAwMjk2NH0.p7x3MPizmNdX57KzX5T4c15ytuH1oznjFqyp14HD-QU';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    console.log("Creative Engine Asset Store script cargado.");

    // Lógica para la página de inicio de sesión
    const standardLoginForm = document.getElementById('standard-login-form');
    const devLoginForm = document.getElementById('developer-login-form');
    const emailInput = document.getElementById('email');
    const backToStandardBtn = document.getElementById('back-to-standard-login');

    // Solo ejecutar si estamos en la página de login
    if (standardLoginForm && devLoginForm && emailInput && backToStandardBtn) {

        const devSuffix = '#Desarrollador809402';

        function showDevForm() {
            standardLoginForm.style.display = 'none';
            devLoginForm.style.display = 'block';
        }

        function showStandardForm() {
            devLoginForm.style.display = 'none';
            standardLoginForm.style.display = 'block';
        }

        // 1. Comprobar el sufijo en el email
        emailInput.addEventListener('keyup', () => {
            if (emailInput.value.endsWith(devSuffix)) {
                showDevForm();
            }
        });

        // 2. Comprobar el atajo de teclado
        document.addEventListener('keydown', (e) => {
            // Shift + D + C
            if (e.shiftKey && !e.ctrlKey && e.key === 'D' && !e.repeat) { // Se quitó e.ctrlKey
                // Prevenir que se active repetidamente si se mantiene presionado
                 e.preventDefault();
                 document.addEventListener('keydown', (e2) => {
                     if(e2.key == 'C' && e.shiftKey && !e.ctrlKey){ // Se quitó e.ctrlKey
                        e.preventDefault();
                        showDevForm();
                     }
                 }, { once: true });
            }
        });

        // 3. Botón para volver al formulario estándar
        backToStandardBtn.addEventListener('click', showStandardForm);

        // Lógica para el envío del formulario de inicio de sesión estándar
        const loginForm = standardLoginForm.querySelector('form');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                alert(`Error al iniciar sesión: ${error.message}`);
            } else {
                alert('¡Inicio de sesión exitoso!');
                window.location.href = 'index.html'; // Redirigir a la página de inicio
            }
        });

        // Lógica para el envío del formulario de desarrollador
        const devForm = devLoginForm.querySelector('form');
        devForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const devCode = e.target['dev-code'].value;
            const devPassword = e.target['dev-password'].value;

            // --- SIMULACIÓN DE VERIFICACIÓN ---
            // NOTA: En un entorno de producción, esto DEBE hacerse en un Edge Function
            // para verificar de forma segura la contraseña hasheada sin exponerla.
            // Por ahora, solo comprobaremos si el código existe.
            const { data, error } = await supabaseClient
                .from('dev_codes')
                .select('code')
                .eq('code', devCode)
                .single(); // .single() devolverá un error si no se encuentra exactamente una fila

            if (error || !data) {
                alert('Código de desarrollador o contraseña incorrectos.');
            } else {
                // Verificación exitosa (simulada)
                alert('Verificación de desarrollador exitosa. Por favor, inicie sesión con su cuenta principal.');
                sessionStorage.setItem('is_developer_gate_passed', 'true');
                showStandardForm(); // Volver al formulario de login estándar
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
        configBtn.addEventListener('click', () => {
            configDropdown.style.display = configDropdown.style.display === 'block' ? 'none' : 'block';
        });

        window.addEventListener('click', (e) => {
            if (!configBtn.contains(e.target) && !configDropdown.contains(e.target)) {
                configDropdown.style.display = 'none';
            }
        });
    }

    function updateUserUI(user) {
        if (!configDropdown) return;

        let dropdownHTML = '';
        if (user) {
            // Usuario está logueado
            dropdownHTML = `
                <a href="my-assets.html">Mis Assets</a>
                <a href="dashboard.html">Mi Panel (Vendedor)</a>
                <a href="#" id="logout-btn">Cerrar Sesión</a>
            `;
            // Nota: "Mis Assets" es la nueva página con Carrito, Deseos, etc.
        } else {
            // Usuario no está logueado
            dropdownHTML = `
                <a href="login.html">Iniciar Sesión</a>
                <a href="register.html">Registrarse</a>
            `;
            sessionStorage.removeItem('is_developer_gate_passed');
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

    supabaseClient.auth.onAuthStateChange((event, session) => {
        const user = session?.user;
        updateUserUI(user);
    });

    // Lógica para la página de subida de productos
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
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
            try {
                // 1. Subir archivo principal
                const timestamp = Date.now();
                const mainFilePath = `${user.id}/${timestamp}-${mainFile.name}`;
                const { error: mainFileError } = await supabaseClient.storage
                    .from('product_files')
                    .upload(mainFilePath, mainFile);
                if (mainFileError) throw mainFileError;

                const { data: { publicUrl: mainFileUrl } } = supabaseClient.storage.from('product_files').getPublicUrl(mainFilePath);

                // 2. Insertar en la tabla 'products'
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
                for (const image of images) {
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

                alert('¡Producto subido exitosamente! Será revisado por un administrador.');
                window.location.href = 'dashboard.html';

            } catch (error) {
                console.error('Error al subir el producto:', error);
                alert(`Error al subir el producto: ${error.message}`);
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
                            <p class="asset-price">$${product.price.toFixed(2)}</p>
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
