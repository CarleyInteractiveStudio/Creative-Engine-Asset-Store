// Scripts para la Creative Engine Store

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
    }
});
