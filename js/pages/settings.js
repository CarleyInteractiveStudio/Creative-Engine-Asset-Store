document.addEventListener('DOMContentLoaded', () => {
    // This script assumes window.supabaseClient is already initialized by js/main.js

    // Logic for settings.html
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        const adsToggle = document.getElementById('ads-toggle');

        async function loadSettings() {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            const { data: profile, error } = await window.supabaseClient.from('profiles').select('ads_enabled').eq('id', user.id).single();
            if (!error && profile) {
                adsToggle.checked = profile.ads_enabled;
            }
        }

        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) return;
            const adsEnabled = adsToggle.checked;
            const { error } = await window.supabaseClient.from('profiles').update({ ads_enabled: adsEnabled }).eq('id', user.id);
            if (error) {
                alert('Error saving settings.');
            } else {
                alert('Settings saved.');
                sessionStorage.setItem('user_ads_enabled', adsEnabled); // Update cache
            }
        });

        loadSettings();
    }
});
