document.addEventListener('DOMContentLoaded', () => {
    const earnPointsBtn = document.getElementById('earn-points-btn');

    if (!earnPointsBtn) return;

    // This function is called by the AppLixir SDK when the ad status changes.
    function adStatusCallback(status) {
        console.log('Ad Status from AppLixir:', status);

        // We assume 'ad-reward' is the status for a successfully completed ad.
        // This should be verified with AppLixir's documentation if issues arise.
        if (status === 'ad-reward') {
            console.log('Ad completed, attempting to reward user...');
            earnPointsBtn.disabled = true;
            earnPointsBtn.textContent = 'Procesando...';

            // Invoke the Supabase Edge Function to securely award points.
            // The user's identity is automatically passed via the auth token.
            supabaseClient.functions.invoke('reward-user-for-ad', {})
                .then(response => {
                    if (response.error) {
                        // Re-throw the error to be caught by the catch block
                        throw new Error(response.error.message);
                    }
                    console.log('Reward function response:', response.data);
                    alert('¡Has ganado 5 puntos!');

                    // Reload the page to update the user's point display in the header.
                    // This is a simple way to reflect the change without complex state management.
                    window.location.reload();
                })
                .catch(error => {
                    console.error('Error rewarding user:', error);
                    alert(`Hubo un problema al otorgar tus puntos: ${error.message}`);
                    // Re-enable the button if the reward failed
                    earnPointsBtn.disabled = false;
                    earnPointsBtn.textContent = 'Ver Anuncio para Ganar Puntos';
                });
        }
    }

    async function initializeAdButton() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            earnPointsBtn.style.display = 'none';
            return;
        }

        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('ads_enabled')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching user profile for ad preference:', error);
            earnPointsBtn.style.display = 'none';
            return;
        }

        if (profile && profile.ads_enabled) {
            earnPointsBtn.style.display = 'inline-block';
            earnPointsBtn.textContent = 'Ver Anuncio para Ganar Puntos';

            earnPointsBtn.addEventListener('click', () => {
                const options = {
                    zoneId: APPLIXIR_CONFIG.zoneId,
                    devId: APPLIXIR_CONFIG.devId,
                    gameId: APPLIXIR_CONFIG.gameId,
                    adStatusCb: adStatusCallback,
                    fallback: 1,
                    verbosity: 0
                };
                invokeApplixirVideoUnit(options);
            });
        } else {
            earnPointsBtn.style.display = 'none';
        }
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
            initializeAdButton();
        } else if (event === 'SIGNED_OUT') {
            earnPointsBtn.style.display = 'none';
        }
    });
});
