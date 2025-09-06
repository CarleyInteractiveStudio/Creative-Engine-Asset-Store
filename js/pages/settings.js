document.addEventListener('DOMContentLoaded', () => {
    const supabaseUrl = 'https://tladrluezsmmhjbhupgb.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsYWRybHVlenNtbWhqYmh1cGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY5NjQsImV4cCI6MjA3MTAwMjk2NH0.p7x3MPizmNdX57KzX5T4c15ytuH1oznjFqyp14HD-QU';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

    // Logic for settings.html
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        const adsToggle = document.getElementById('ads-toggle');

        async function loadSettings() {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            const { data: profile, error } = await supabaseClient.from('profiles').select('ads_enabled').eq('id', user.id).single();
            if (!error && profile) {
                adsToggle.checked = profile.ads_enabled;
            }
        }

        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return;
            const adsEnabled = adsToggle.checked;
            const { error } = await supabaseClient.from('profiles').update({ ads_enabled: adsEnabled }).eq('id', user.id);
            if (error) {
                alert('Error saving settings.');
            } else {
                alert('Settings saved.');
                sessionStorage.setItem('user_ads_enabled', adsEnabled); // Update cache
            }
        });

        loadSettings();
    }

    // Logic for payout-settings.html
    const payoutForm = document.getElementById('payout-form');
    if (payoutForm) {
        const emailInput = document.getElementById('paypal-email');

        async function loadPayoutSettings() {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            const { data, error } = await supabaseClient.from('profiles').select('paypal_email').eq('id', user.id).single();
            if (!error && data && data.paypal_email) {
                emailInput.value = data.paypal_email;
            }
        }

        payoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return;
            const newEmail = emailInput.value;
            const { error } = await supabaseClient.from('profiles').update({ paypal_email: newEmail }).eq('id', user.id);
            if (error) {
                alert('Error saving settings.');
            } else {
                alert('Payout settings saved successfully!');
            }
        });

        loadPayoutSettings();
    }
});
