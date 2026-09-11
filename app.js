document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Mobile Menu Toggle
  setupMobileMenu();

  // Reservation Modal & WhatsApp Integrations
  setupReservationModal();

  // Gallery Lightbox Modal
  setupGalleryLightbox();

  // Floating Chat Widget -> WhatsApp
  setupChatWidget();
});

/* Mobile Menu Drawer */
function setupMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('close-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  if (!menuBtn || !mobileMenu) return;

  const toggleMenu = (open) => {
    if (open) {
      mobileMenu.classList.remove('translate-x-full');
      mobileMenu.classList.add('translate-x-0');
      document.body.style.overflow = 'hidden';
    } else {
      mobileMenu.classList.add('translate-x-full');
      mobileMenu.classList.remove('translate-x-0');
      document.body.style.overflow = '';
    }
  };

  menuBtn.addEventListener('click', () => toggleMenu(true));
  if (closeBtn) closeBtn.addEventListener('click', () => toggleMenu(false));

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });
}

/* Quick Reservation Modal & Dynamic WhatsApp Builder */
function setupReservationModal() {
  const openBtns = document.querySelectorAll('.trigger-reserve-modal');
  const modal = document.getElementById('reserve-modal');
  const closeBtn = document.getElementById('close-reserve-modal');
  const form = document.getElementById('reserve-form');
  const eventSelect = document.getElementById('reserve-event-select');

  if (!modal) return;

  openBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const eventName = btn.getAttribute('data-event-name');
      if (eventName && eventSelect) {
        // Solo preselecciona si esa modalidad existe en el desplegable
        const match = Array.from(eventSelect.options).some(o => o.value === eventName);
        eventSelect.value = match ? eventName : eventSelect.options[0].value;
      }
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.body.style.overflow = 'hidden';
    });
  });

  const closeModal = () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('res-name').value.trim();
      const people = document.getElementById('res-people').value;
      const date = document.getElementById('res-date').value;
      const type = document.getElementById('reserve-event-select').value;
      const notes = document.getElementById('res-notes').value.trim();

      let message = `Hola! Quiero hacer una reserva en Capua 6:%0A`;
      message += `• Nombre: ${encodeURIComponent(name)}%0A`;
      message += `• Personas: ${encodeURIComponent(people)}%0A`;
      message += `• Fecha / Hora: ${encodeURIComponent(date)}%0A`;
      message += `• Tipo de Reserva: ${encodeURIComponent(type)}`;

      if (notes) {
        message += `%0A• Notas adicionales: ${encodeURIComponent(notes)}`;
      }

      const whatsappURL = `https://wa.me/34604809890?text=${message}`;
      window.open(whatsappURL, '_blank');
      closeModal();
    });
  }
}

/* Lightbox Photo Gallery Modal */
function setupGalleryLightbox() {
  const galleryItems = document.querySelectorAll('.gallery-item');
  const lightbox = document.getElementById('gallery-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const closeBtn = document.getElementById('close-lightbox');

  if (!lightbox) return;

  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      const caption = item.getAttribute('data-caption') || 'Capua 6 Gijón';
      if (img && lightboxImg) {
        lightboxImg.src = img.src;
        if (lightboxCaption) lightboxCaption.textContent = caption;
        lightbox.classList.remove('hidden');
        lightbox.classList.add('flex');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  const closeLightbox = () => {
    lightbox.classList.add('hidden');
    lightbox.classList.remove('flex');
    document.body.style.overflow = '';
  };

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
}

/* Floating Chat Widget -> WhatsApp deep links */
function setupChatWidget() {
  const widget = document.getElementById('chat-widget');
  const launcher = document.getElementById('chat-launcher');
  const panel = document.getElementById('chat-panel');
  const closeBtn = document.getElementById('chat-close');
  const replies = document.querySelectorAll('.chat-reply');

  if (!widget || !launcher) return;

  // Número de Capua 6 en formato internacional (solo dígitos)
  const WA_PHONE = '34604809890';

  // Mensaje predefinido de WhatsApp según la opción elegida
  const MESSAGES = {
    reserva: 'Hola! Quiero reservar una mesa o reservado VIP en Capua 6. ¿Me confirmáis disponibilidad?',
    precios: 'Hola! Me gustaría conocer los precios y los packs de reservados VIP / botellas de Capua 6.',
    ubicacion: 'Hola! ¿Me podéis confirmar la ubicación exacta y cómo llegar a Capua 6?',
    whatsapp: 'Hola! Tengo una consulta sobre Capua 6.'
  };

  const setOpen = (open) => {
    widget.classList.toggle('is-open', open);
    launcher.setAttribute('aria-expanded', String(open));
    if (panel) panel.setAttribute('aria-hidden', String(!open));
  };

  launcher.addEventListener('click', () => {
    setOpen(!widget.classList.contains('is-open'));
  });

  if (closeBtn) closeBtn.addEventListener('click', () => setOpen(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && widget.classList.contains('is-open')) setOpen(false);
  });

  replies.forEach((btn) => {
    btn.addEventListener('click', () => {
      const intent = btn.getAttribute('data-intent');
      const text = MESSAGES[intent] || MESSAGES.whatsapp;
      const url = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      setOpen(false);
    });
  });
}
