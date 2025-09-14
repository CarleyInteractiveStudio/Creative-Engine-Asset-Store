document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settings-form');
    const adsToggle = document.getElementById('ads-toggle');
    const saveButton = settingsForm ? settingsForm.querySelector('button[type="submit"]') : null;

    // If the required elements for ad settings are not on this page, do nothing.
    if (!settingsForm || !adsToggle || !saveButton) {
        return;
    }

    // This function loads the user's current preference and sets the toggle state.
    async function loadSettings() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            // This should be handled by global page protection, but as a safeguard:
            console.warn("User not logged in on settings page. Redirecting.");
            window.location.href = 'login.html';
            return;
        }

        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('ads_enabled')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error loading ad settings:', error);
            alert('Error al cargar la configuración de anuncios.');
        } else if (profile) {
            // Set the toggle to the value from the database.
            // The !! operator ensures that null or undefined becomes false.
            adsToggle.checked = !!profile.ads_enabled;
        }
    }

    // This function handles the form submission to save the new preference.
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const originalButtonText = saveButton.textContent;
        saveButton.disabled = true;
        saveButton.textContent = 'Guardando...';

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            alert('Debes iniciar sesión para guardar la configuración.');
            window.location.href = 'login.html';
            return;
        }

        const adsEnabled = adsToggle.checked;
        const { error } = await supabaseClient
            .from('profiles')
            .update({ ads_enabled: adsEnabled })
            .eq('id', user.id);

        if (error) {
            alert('Error al guardar la configuración: ' + error.message);
        } else {
            alert('Configuración guardada exitosamente.');
            // Update the session cache to be used by other pages immediately
            sessionStorage.setItem('user_ads_enabled', adsEnabled);
        }

        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
    });

    // Initial load of settings when the page is ready
    loadSettings();
});
