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
    const userActionsDiv = document.querySelector('.user-actions');

    function setupLogoutButton() {
        const logoutButton = document.getElementById('logout-btn');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                await supabaseClient.auth.signOut();
                // onAuthStateChange se encargará de actualizar la UI
            });
        }
    }

    function updateUserUI(user) {
        if (user) {
            // Usuario está logueado
            let dashboardLink = '<a href="dashboard.html" class="btn btn-primary">Mi Panel</a>';
            if (sessionStorage.getItem('is_developer_gate_passed') === 'true') {
                console.log("Sesión de desarrollador activa.");
                // Si es desarrollador, podría tener un panel de admin en lugar de vendedor
                // dashboardLink = '<a href="admin.html" class="btn btn-primary">Panel de Admin</a>';
            }

            userActionsDiv.innerHTML = `
                ${dashboardLink}
                <a href="#" id="logout-btn" class="btn btn-secondary">Cerrar Sesión</a>
            `;
            setupLogoutButton();
        } else {
            // Usuario no está logueado
            userActionsDiv.innerHTML = `
                <a href="login.html" class="btn btn-secondary">Iniciar Sesión</a>
                <a href="register.html" class="btn btn-primary">Registrarse</a>
            `;
            sessionStorage.removeItem('is_developer_gate_passed');
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
});
