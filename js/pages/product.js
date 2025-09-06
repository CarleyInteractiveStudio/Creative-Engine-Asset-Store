document.addEventListener('DOMContentLoaded', () => {
    const supabaseUrl = 'TU_SUPABASE_URL';
    const supabaseKey = 'TU_SUPABASE_KEY';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

    // Guard to run only on product page
    const productActions = document.querySelector('.product-actions');
    if (!productActions) return;

    // Logic to show the correct purchase buttons
    const buyButton = productActions.querySelector('.btn-buy');
    const pointsButton = productActions.querySelector('.btn-buy-points');
    const freeButton = productActions.querySelector('.btn-get-free');
    const price = parseFloat(buyButton.dataset.price);

    if (price === 0) {
        buyButton.style.display = 'none';
        pointsButton.style.display = 'none';
        freeButton.style.display = 'inline-block';
        const priceDisplay = document.querySelector('.product-info-panel .product-price');
        if (priceDisplay) priceDisplay.textContent = 'Gratis';
    } else {
        (async () => {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                const { data: profile } = await supabaseClient.from('profiles').select('points').eq('id', user.id).single();
                const pointCost = price * 100;
                if (profile.points < pointCost) {
                    pointsButton.disabled = true;
                    pointsButton.textContent = `Puntos insuficientes (${profile.points}/${pointCost})`;
                }
            } else {
                pointsButton.disabled = true;
            }
        })();
    }

    // PayPal Button Rendering
    const paypalButtonContainer = document.getElementById('paypal-button-container');
    if (paypalButtonContainer && price > 0) {
        const productId = productActions.querySelector('.btn-buy-points').dataset.productId;
        if (typeof paypal !== 'undefined') {
            paypal.Buttons({
                async createOrder() {
                    try {
                        const { data, error } = await supabaseClient.functions.invoke('paypal-create-order', { body: { productId } });
                        if (error) throw new Error(error.message);
                        return data.orderID;
                    } catch (err) {
                        alert('Could not initiate payment.');
                    }
                },
                async onApprove(data) {
                    try {
                        const { error } = await supabaseClient.functions.invoke('paypal-capture-order', { body: { orderID: data.orderID, productId } });
                        if (error) throw new Error(error.message);
                        alert('Purchase successful! The asset has been added to your collection.');
                        window.location.href = 'my-assets.html';
                    } catch (err) {
                        alert('There was an error processing your payment.');
                    }
                },
                onError(err) {
                    console.error('PayPal SDK Error:', err);
                    alert('An unexpected error occurred with PayPal.');
                }
            }).render('#paypal-button-container');
        } else {
            console.error('PayPal SDK has not loaded.');
        }
    }
});
