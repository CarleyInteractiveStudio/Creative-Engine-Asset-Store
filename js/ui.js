function createProductCard(product) {
    const imageUrl = product.image_url || 'https://via.placeholder.com/300x200.png?text=No+Image';

    const starDisplay = product.total_stars > 0
        ? `<div class="asset-rating-summary">★ ${product.total_stars} Estrellas</div>`
        : '';

    const priceDisplay = product.price === 0 ? 'Gratis' : `\$${product.price.toFixed(2)}`;

    return `
        <a href="product.html?id=${product.id}" class="asset-card">
            <button class="wishlist-btn" data-product-id="${product.id}">❤️</button>
            <img src="${imageUrl}" alt="${product.name}" class="asset-image">
            <div class="asset-info">
                <h3 class="asset-title">${product.name}</h3>
                ${starDisplay}
                <p class="asset-price">${priceDisplay}</p>
            </div>
        </a>
    `;
}
