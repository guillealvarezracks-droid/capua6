document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Mobile Menu Toggle
  setupMobileMenu();

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

  let isOpen = false;

  const toggleMenu = (open) => {
    isOpen = open;
    if (open) {
      mobileMenu.classList.remove('translate-x-full');
      mobileMenu.classList.add('translate-x-0');
      mobileMenu.inert = false;
      document.body.style.overflow = 'hidden';
      menuBtn.setAttribute('aria-expanded', 'true');
    } else {
      mobileMenu.classList.add('translate-x-full');
      mobileMenu.classList.remove('translate-x-0');
      mobileMenu.inert = true;
      document.body.style.overflow = '';
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  };

  // Cierra y devuelve el foco al botón que abrió el menú (botón de cierre / Escape)
  const closeAndReturnFocus = () => {
    toggleMenu(false);
    menuBtn.focus();
  };

  menuBtn.addEventListener('click', () => toggleMenu(true));
  if (closeBtn) closeBtn.addEventListener('click', closeAndReturnFocus);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeAndReturnFocus();
  });

  // Al elegir una sección del menú, se cierra y la navegación sigue su curso normal
  // (no se fuerza el foco al botón, ya que la intención del usuario es ir a esa sección)
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });
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
  const GENERAL_MESSAGE = '¡Hola! Me gustaría organizar un evento en Capua 6.\n\n' +
    '📅 Fecha: \n' +
    '👥 Número de personas: \n' +
    '🕒 Hora aproximada de inicio: \n' +
    '🎉 Modalidad: [Espicha / Híbrida / Alquiler exclusivo / Evento a medida / Necesito asesoramiento]\n\n' +
    '¿Podéis ayudarme con la disponibilidad y las opciones?';

  const MESSAGES = {
    reserva: GENERAL_MESSAGE,
    ubicacion: 'Hola! ¿Me podéis confirmar la ubicación exacta y cómo llegar a Capua 6?',
    whatsapp: GENERAL_MESSAGE
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
      // Se usa api.whatsapp.com/send directamente (no wa.me): el acortador wa.me
      // corrompe los emoji del mensaje en su redirección.
      const url = `https://api.whatsapp.com/send/?phone=${WA_PHONE}&text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      setOpen(false);
    });
  });
}
