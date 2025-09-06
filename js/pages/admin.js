document.addEventListener('DOMContentLoaded', () => {
    const supabaseUrl = 'TU_SUPABASE_URL';
    const supabaseKey = 'TU_SUPABASE_KEY';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

    // Guard to ensure this only runs on the admin page
    const pendingProductsList = document.getElementById('pending-products-list');
    if (!pendingProductsList) return;

    // --- Admin Page Logic ---

    // Load Stats
    async function loadAdminStats() {
        const { count, error: countError } = await supabaseClient
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'approved');
        document.getElementById('stats-total-products').textContent = countError ? 'N/A' : count;

        const totalRevenue = 12540.50;
        const monthlySales = 1850.75;
        document.getElementById('stats-total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
        document.getElementById('stats-monthly-sales').textContent = `$${monthlySales.toFixed(2)}`;
    }

    // Load Pending Products
    async function loadPendingProducts() {
        const { data: products, error } = await supabaseClient
            .from('products').select(`id, name, price, profiles ( id, username )`).eq('status', 'pending');
        if (error) {
            console.error('Error loading pending products:', error);
            pendingProductsList.innerHTML = '<p class="error">Could not load products.</p>';
            return;
        }
        let productHTML = '';
        for (const product of products) {
            productHTML += `
                <div class="pending-product-item" id="product-${product.id}">
                    <div class="pending-product-info">
                        <h3>${product.name}</h3>
                        <p>Seller: ${product.profiles.username || 'N/A'} | Price: $${product.price.toFixed(2)}</p>
                    </div>
                    <div class="pending-product-actions">
                        <button class="btn btn-primary approve-btn" data-id="${product.id}">Approve</button>
                        <button class="btn btn-secondary reject-btn" data-id="${product.id}">Reject</button>
                    </div>
                </div>`;
        }
        pendingProductsList.innerHTML = productHTML || '<p>No products pending review.</p>';
    }

    // Load Approved Products
    const approvedProductsList = document.getElementById('approved-products-list');
    async function loadApprovedProducts() {
         const { data: products, error } = await supabaseClient
            .from('products').select(`id, name, price, is_suspended, profiles ( id, username )`).eq('status', 'approved');
        if (error) {
            console.error('Error loading approved products:', error);
            return;
        }
        let productHTML = '';
        for (const product of products) {
            const suspendButtonText = product.is_suspended ? 'Unsuspend' : 'Suspend';
            productHTML += `
                <div class="pending-product-item" id="product-approved-${product.id}">
                    <div class="pending-product-info">
                        <h3 class="${product.is_suspended ? 'suspended-text' : ''}">${product.name}</h3>
                        <p>Seller: ${product.profiles.username || 'N/A'}</p>
                    </div>
                    <div class="pending-product-actions">
                        <a href="edit-product.html?id=${product.id}" class="btn btn-secondary">Edit</a>
                        <button class="btn btn-secondary suspend-btn" data-id="${product.id}" data-suspended="${product.is_suspended}">${suspendButtonText}</button>
                        <button class="btn btn-danger delete-btn" data-id="${product.id}">Delete</button>
                    </div>
                </div>`;
        }
        approvedProductsList.innerHTML = productHTML || '<p>No approved products.</p>';
    }

    // --- Event Handlers for Admin Actions ---
    const modal = document.getElementById('rejection-modal');
    const closeModalBtn = modal.querySelector('.close-btn');
    const submitRejectionBtn = modal.querySelector('#submit-rejection-btn');
    const rejectionReasonText = modal.querySelector('#rejection-reason-text');
    let currentRejectingProductId = null;

    closeModalBtn.addEventListener('click', () => modal.style.display = 'none');

    async function handleApproval(productId) {
        const { error } = await supabaseClient.from('products').update({ status: 'approved' }).eq('id', productId);
        if (error) {
            alert('Error approving product.');
        } else {
            document.getElementById(`product-${productId}`).remove();
            supabaseClient.functions.invoke('send-product-status-email', { body: { productId: productId, status: 'approved' } });
        }
    }

    async function handleRejection(productId, reason) {
        const { error } = await supabaseClient.from('products').update({ status: 'rejected', rejection_reason: reason }).eq('id', productId);
         if (error) {
            alert('Error rejecting product.');
        } else {
            modal.style.display = 'none';
            document.getElementById(`product-${productId}`).remove();
            supabaseClient.functions.invoke('send-product-status-email', { body: { productId: productId, status: 'rejected', reason: reason } });
        }
    }

    pendingProductsList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('approve-btn')) {
            handleApproval(target.dataset.id);
        } else if (target.classList.contains('reject-btn')) {
            currentRejectingProductId = target.dataset.id;
            rejectionReasonText.value = '';
            modal.style.display = 'block';
        }
    });

    submitRejectionBtn.addEventListener('click', () => {
        const reason = rejectionReasonText.value;
        if (!reason) {
            alert('Please provide a reason for rejection.');
            return;
        }
        handleRejection(currentRejectingProductId, reason);
    });

    approvedProductsList.addEventListener('click', async (e) => {
        const target = e.target;
        const id = target.dataset.id;

        if (target.classList.contains('suspend-btn')) {
            const isSuspended = target.dataset.suspended === 'true';
            const { error } = await supabaseClient.from('products').update({ is_suspended: !isSuspended }).eq('id', id);
            if (error) {
                alert('Error updating product status.');
            } else {
                target.dataset.suspended = !isSuspended;
                target.textContent = !isSuspended ? 'Unsuspend' : 'Suspend';
                document.querySelector(`#product-approved-${id} h3`).classList.toggle('suspended-text');
                supabaseClient.functions.invoke('send-product-status-email', { body: { productId: id, status: !isSuspended ? 'unsuspended' : 'suspended' } });
            }
        } else if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to permanently delete this product?')) {
                const { error } = await supabaseClient.from('products').delete().eq('id', id);
                if (error) {
                    alert('Error deleting product.');
                } else {
                    document.getElementById(`product-approved-${id}`).remove();
                    supabaseClient.functions.invoke('send-product-status-email', { body: { productId: id, status: 'deleted' } });
                }
            }
        }
    });

    // Initial Load
    loadPendingProducts();
    loadApprovedProducts();
    loadAdminStats();
});
