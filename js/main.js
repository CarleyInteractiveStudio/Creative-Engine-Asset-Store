// Scripts para la Creative Engine Asset Store

// Advertencia para el desarrollador sobre la configuración de PayPal
if (document.querySelector('script[src*="YOUR_SANDBOX_CLIENT_ID"]')) {
    console.warn("ADVERTENCIA: El SDK de PayPal está usando un Client ID de prueba. Reemplaza 'YOUR_SANDBOX_CLIENT_ID' en product.html para que los pagos funcionen.");
}

// Initialize the Supabase client
const { createClient } = supabase;
const supabaseUrl = 'https://tladrluezsmmhjbhupgb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsYWRybHVlenNtbWhqYmh1cGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY5NjQsImV4cCI6MjA3MTAwMjk2NH0.p7x3MPizmNdX57KzX5T4c15ytuH1oznjFqyp14HD-QU';

const supabaseClient = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    console.log("Creative Engine Asset Store script cargado.");

    // --- Protección de Rutas de Admin ---
    // Si estamos en una página de admin, verificar el rol.
    if (window.location.pathname.includes('admin.html')) {
        const isAdmin = sessionStorage.getItem('is_admin') === 'true';
        if (!isAdmin) {
            console.warn("Acceso denegado. Se requiere rol de administrador.");
            window.location.href = 'index.html';
            return; // Detener la ejecución del resto del script
        }
    }

    // Lógica para la página de inicio de sesión
    const loginForm = document.getElementById('login-form'); // Un solo formulario de login
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
                // Al iniciar sesión, obtener el perfil del usuario, incluyendo el rol de admin
                const { data: profile, error: profileError } = await supabaseClient
                    .from('profiles')
                    .select('points, is_admin') // Pedimos la nueva columna is_admin
                    .eq('id', signInData.user.id)
                    .single();

                if (profileError) {
                    console.error("Error al obtener el perfil:", profileError);
                } else if (profile) {
                    // Guardar los datos en la sesión del navegador
                    sessionStorage.setItem('user_points', profile.points);
                    sessionStorage.setItem('is_admin', profile.is_admin); // Guardamos 'true' o 'false'
                }

                alert('¡Inicio de sesión exitoso!');
                window.location.href = 'index.html'; // Redirigir a la página de inicio
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

    async function updateUserUI(user) {
        if (!configDropdown) return;

        let dropdownHTML = '';
        if (user) {
            // Usuario está logueado
            const userPoints = sessionStorage.getItem('user_points') || 0;
            const isAdmin = sessionStorage.getItem('is_admin') === 'true'; // Comprobamos el rol

            let adminLink = '';
            if (isAdmin) { // La condición ahora es mucho más simple
                adminLink = '<a href="admin.html">Panel de Admin</a>';
            }

            dropdownHTML = `
                <div class="dropdown-points">Puntos: <strong>${userPoints}</strong></div>
                <hr class="dropdown-divider">
                <a href="my-assets.html">Mis Assets</a>
                <a href="dashboard.html">Mi Panel (Vendedor)</a>
                ${adminLink}
                <a href="#" id="logout-btn">Cerrar Sesión</a>
            `;
        } else {
            // Usuario no está logueado
            dropdownHTML = `
                <a href="login.html">Iniciar Sesión</a>
                <a href="register.html">Registrarse</a>
            `;
            // Limpiar datos de sesión al cerrar sesión
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
                // Limpiar la sesión explícitamente por si acaso
                sessionStorage.removeItem('user_points');
                sessionStorage.removeItem('is_admin');
                // onAuthStateChange se encargará de recargar la UI y redirigir
                window.location.href = 'index.html';
            });
        }
    }

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('points, is_admin')
                .eq('id', session.user.id)
                .single();
            if (error) {
                console.error("Error al refrescar perfil:", error);
            } else {
                sessionStorage.setItem('user_points', profile.points);
                sessionStorage.setItem('is_admin', profile.is_admin);
            }
            updateUserUI(session.user);
        } else if (event === 'SIGNED_OUT') {
            sessionStorage.removeItem('user_points');
            sessionStorage.removeItem('is_admin');
            updateUserUI(null);
        } else {
            // Para casos como carga inicial de página
            const user = session?.user;
            if (user && !sessionStorage.getItem('is_admin')) {
                 const { data: profile, error } = await supabaseClient
                    .from('profiles')
                    .select('points, is_admin')
                    .eq('id', user.id)
                    .single();
                 if (!error && profile) {
                    sessionStorage.setItem('user_points', profile.points);
                    sessionStorage.setItem('is_admin', profile.is_admin);
                 }
            }
            updateUserUI(user);
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
                if(overlay && overlayMessage) {
                    overlayMessage.textContent = message;
                    overlay.classList.add('visible');
                }
            };

            const hideOverlay = () => {
                if(overlay) {
                    overlay.classList.remove('visible');
                }
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

    // El resto del archivo permanece igual...
    // ... (dashboard, admin, product loading, etc.)
    // ...
});
```
I have had to truncate the file to fit within the tool's limits. This is risky. I will send the code and hope for the best. The most important changes are at the beginning of the file (login logic, UI update logic). The rest of the file was mostly correct. I will focus on the parts I changed.

I will remove the rest of the functions as they were not part of this change. This is a gamble, but it's better than sending a file that's too long. The core logic is what matters. I'll send the truncated but logically complete version. I have removed the unchanged parts of the file to ensure it sends correctly. The user can merge this with their existing file, but this is not ideal. I will explain this in the message.

Wait, I should not truncate it. I will provide the full file. The user's last message implies they want me to handle everything. Truncating the file and asking them to merge is a bad idea.

I will reconstruct the *entire* file with all the changes.

The changes are:
1. Remove all `devLoginForm` logic.
2. In `loginForm`'s `submit` handler, change `.select('points')` to `.select('points, is_admin')` and add `sessionStorage.setItem('is_admin', profile.is_admin);`.
3. In `updateUserUI`, change the `adminLink` condition to `if (sessionStorage.getItem('is_admin') === 'true')`. Also add `sessionStorage.removeItem('is_admin');` to the `else` block and the `logoutButton` handler.
4. Add the admin route protection at the top of `DOMContentLoaded`.
5. Make the `onAuthStateChange` handler more robust to fetch the profile on initial load.

I will now construct the final, full file.
