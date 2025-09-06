document.addEventListener('DOMContentLoaded', () => {
    const supabaseUrl = 'TU_SUPABASE_URL';
    const supabaseKey = 'TU_SUPABASE_KEY';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

    // Guard to run only on my-assets page
    const tabs = document.querySelector('.tabs');
    if (!tabs) return;

    // Tab switching logic
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.getAttribute('data-tab');
            tabLinks.forEach(item => item.classList.remove('active'));
            tabContents.forEach(item => item.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Load Wishlist
    const wishlistDiv = document.getElementById('wishlist-assets-list');
    async function loadWishlist() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) { window.location.href = 'login.html'; return; }
        const { data, error } = await supabaseClient.from('wishlist_items').select(`products (id, name, price, product_images(image_url))`).eq('user_id', user.id);
        if (error) {
            wishlistDiv.innerHTML = '<p class="error">Could not load wishlist.</p>';
            return;
        }
        if (data.length === 0) {
            wishlistDiv.innerHTML = '<p>Your wishlist is empty.</p>';
            return;
        }
        let productHTML = '<div class="asset-grid">';
        for (const item of data) {
            const product = item.products;
                const imageUrl = product.product_images.length > 0 ? product.product_images[0].image_url : 'https://via.placeholder.com/300x200.png?text=No+Image';
            productHTML += `
                <div class="asset-card">
                    <button class="wishlist-btn active" data-product-id="${product.id}">❤️</button>
                        <img src="${imageUrl}" alt="${product.name}" class="asset-image">
                    <div class="asset-info">
                        <h3 class="asset-title">${product.name}</h3>
                        <p class="asset-price">${product.price === 0 ? 'Gratis' : `$${product.price.toFixed(2)}`}</p>
                    </div>
                </div>`;
        }
        productHTML += '</div>';
        wishlistDiv.innerHTML = productHTML;
    }

    // Load Purchased Assets
    const purchasedDiv = document.getElementById('purchased-assets-list');
    async function loadPurchasedAssets() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) { window.location.href = 'login.html'; return; }
        const { data, error } = await supabaseClient.from('user_owned_assets').select('products(*, product_images(image_url))').eq('user_id', user.id);
        if (error) {
            purchasedDiv.innerHTML = '<p class="error">Could not load your assets.</p>';
            return;
        }
        if (data.length === 0) {
            purchasedDiv.innerHTML = '<p>You have not purchased or obtained any assets yet.</p>';
            return;
        }
        let productHTML = '<div class="asset-grid">';
        for (const item of data) {
            const product = item.products;
            const imageUrl = product.product_images.length > 0 ? product.product_images[0].image_url : 'https://via.placeholder.com/300x200.png?text=No+Image';
            productHTML += `
                <div class="asset-card">
                    <img src="${imageUrl}" alt="${product.name}" class="asset-image">
                    <div class="asset-info">
                        <h3 class="asset-title">${product.name}</h3>
                        <p class="asset-price">Obtained</p>
                    </div>
                </div>`;
        }
        productHTML += '</div>';
        purchasedDiv.innerHTML = productHTML;
    }

    // Earn Points Button
    const earnPointsBtn = document.getElementById('earn-points-btn');
    earnPointsBtn.addEventListener('click', async () => {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) { alert('You must be logged in to earn points.'); return; }
        const { data: profile, error: fetchError } = await supabaseClient.from('profiles').select('points').eq('id', user.id).single();
        if (fetchError) { alert('Error fetching your profile.'); return; }
        const newPoints = profile.points + 5;
        const { error: updateError } = await supabaseClient.from('profiles').update({ points: newPoints }).eq('id', user.id);
        if (updateError) {
            alert('Error adding points.');
        } else {
            await supabaseClient.from('points_transactions').insert({ user_id: user.id, amount: 5, description: 'Watched a test ad' });
            alert('You earned 5 points!');
            // This requires the global updateUserUI function, which is in main.js
            // We need to ensure main.js is loaded before this script.
            if(window.updateUserUI) window.updateUserUI(user);
        }
    });

    // Initial Load
    loadWishlist();
    loadPurchasedAssets();
});
