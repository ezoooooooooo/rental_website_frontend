// Simple Lightbox Gallery for Orders & Requests
(function() {
  function createLightbox(images, startIdx) {
    // Remove any existing lightbox
    const existing = document.querySelector('.lightbox-overlay');
    if (existing) existing.remove();

    let currentIdx = startIdx;

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay active';

    // Content
    const content = document.createElement('div');
    content.className = 'lightbox-content';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'lightbox-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => overlay.remove();
    content.appendChild(closeBtn);

    // Main image
    const img = document.createElement('img');
    img.className = 'lightbox-img';
    content.appendChild(img);

    // Thumbnails
    const thumbs = document.createElement('div');
    thumbs.className = 'lightbox-thumbs';
    content.appendChild(thumbs);

    function show(idx) {
      currentIdx = idx;
      img.src = images[idx];
      // Highlight selected thumb
      Array.from(thumbs.children).forEach((thumb, i) => {
        thumb.classList.toggle('selected', i === idx);
      });
    }

    // Populate thumbs
    images.forEach((src, i) => {
      const thumb = document.createElement('img');
      thumb.className = 'lightbox-thumb';
      thumb.src = src;
      thumb.onclick = () => show(i);
      thumbs.appendChild(thumb);
    });

    // Keyboard navigation
    overlay.tabIndex = 0;
    overlay.onkeydown = (e) => {
      if (e.key === 'Escape') overlay.remove();
      if (e.key === 'ArrowLeft') show((currentIdx - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') show((currentIdx + 1) % images.length);
    };

    // Click outside to close
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };

    // Initial image
    show(startIdx);

    overlay.appendChild(content);
    document.body.appendChild(overlay);
    overlay.focus();
  }

  // Orders
  document.addEventListener('click', function(e) {
    const orderImg = e.target.closest('.order-img-thumb');
    if (orderImg) {
      const card = orderImg.closest('.order-card');
      if (!card) return;
      const imgs = Array.from(card.querySelectorAll('.order-img-thumb')).map(img => img.src);
      const idx = parseInt(orderImg.getAttribute('data-img-idx')) || 0;
      createLightbox(imgs, idx);
    }
    // Requests
    const reqImg = e.target.closest('.request-img-thumb');
    if (reqImg) {
      const card = reqImg.closest('.request-card');
      if (!card) return;
      const imgs = Array.from(card.querySelectorAll('.request-img-thumb')).map(img => img.src);
      const idx = parseInt(reqImg.getAttribute('data-img-idx')) || 0;
      createLightbox(imgs, idx);
    }
  });
})();
