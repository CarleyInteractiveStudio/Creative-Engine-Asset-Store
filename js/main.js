// Scripts para la Creative Engine Store

// Initialize the Supabase client
const { createClient } = supabase;
const supabaseUrl = 'https://tladrluezsmmhjbhupgb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsYWRybHVlenNtbWhqYmh1cGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY5NjQsImV4cCI6MjA3MTAwMjk2NH0.p7x3MPizmNdX57KzX5T4c15ytuH1oznjFqyp14HD-QU';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    console.log("Creative Engine Store script cargado.");

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
            // Ctrl + Shift + D + C
            if (e.ctrlKey && e.shiftKey && e.key === 'D' && !e.repeat) {
                // Prevenir que se active repetidamente si se mantiene presionado
                 e.preventDefault();
                 document.addEventListener('keydown', (e2) => {
                     if(e2.key == 'C' && e.ctrlKey && e.shiftKey){
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
            userActionsDiv.innerHTML = `
                <a href="#" id="logout-btn" class="btn btn-secondary">Cerrar Sesión</a>
            `;
            if (sessionStorage.getItem('is_developer_gate_passed') === 'true') {
                console.log("Sesión de desarrollador activa.");
                // Aquí se podría añadir un enlace al panel de admin, etc.
            }
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
});
