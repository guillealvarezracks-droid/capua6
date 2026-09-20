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

  // Calendario público de disponibilidad (lee de Supabase: solo fecha + libre/ocupado)
  setupDisponibilidad();
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

/* Calendario público de disponibilidad
   ---------------------------------------------------------------------
   Lee la disponibilidad desde Supabase llamando a la función
   disponibilidad_publica(desde, hasta), que SOLO devuelve {fecha,
   disponible} por cada día — nunca nombres, teléfonos, modalidad,
   precios ni nada del panel interno de reservas. Esa separación está
   forzada desde la propia base de datos (permisos del rol público),
   no solo por lo que esta pantalla decide mostrar.

   La clave usada aquí ("publishable") está pensada para ir en el
   navegador: no da acceso a nada más que esa función pública. */
function setupDisponibilidad() {
  const grid = document.getElementById('disp-grid');
  const gridWrap = document.getElementById('disp-grid-wrap');
  const estado = document.getElementById('disp-estado');
  const mesLabel = document.getElementById('disp-mes-label');
  const btnPrev = document.getElementById('disp-prev');
  const btnNext = document.getElementById('disp-next');

  if (!grid || !gridWrap || !estado || !mesLabel || !btnPrev || !btnNext) return;
  if (!window.supabase) {
    estado.textContent = 'No se ha podido cargar el calendario. Escríbenos por WhatsApp y te confirmamos la disponibilidad.';
    return;
  }

  const SUPABASE_URL = 'https://yeqeqethclksyjbrhcqm.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_rX2QVcxaR1MvP4TzOjOrjA_EGZe50vp';
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  const WA_PHONE = '34604809890';
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  const hoy = new Date();
  const hoyISO = aISO(hoy);
  let cursor = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const primerMesPermitido = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const ultimoMesPermitido = new Date(hoy.getFullYear(), hoy.getMonth() + 5, 1); // 6 meses vista (mes actual + 5)

  function aISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function aFechaBonita(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function abrirWhatsAppConFecha(iso) {
    const fecha = aFechaBonita(iso);
    const text = `¡Hola! Me gustaría consultar disponibilidad para el ${fecha}.\n\n` +
      `📅 Fecha: ${fecha}\n` +
      `👥 Número de personas: \n` +
      `🕒 Hora aproximada de inicio: \n` +
      `🎉 Modalidad: [Espicha / Híbrida / Alquiler exclusivo / Evento a medida / Necesito asesoramiento]\n\n` +
      `¿Podéis confirmarme si esa fecha sigue libre?`;
    const url = `https://api.whatsapp.com/send/?phone=${WA_PHONE}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  function pintarGrid(mesRef, disponiblePorFecha) {
    grid.innerHTML = '';
    const primerDia = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1);
    const diasEnMes = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0).getDate();
    const offset = primerDia.getDay(); // domingo=0, coincide con la cabecera D L M X J V S

    for (let i = 0; i < offset; i++) {
      grid.appendChild(document.createElement('span'));
    }

    for (let dia = 1; dia <= diasEnMes; dia++) {
      const iso = aISO(new Date(mesRef.getFullYear(), mesRef.getMonth(), dia));
      const esPasado = iso < hoyISO;
      const disponible = !!disponiblePorFecha[iso];
      const esClicable = !esPasado && disponible;

      const celda = document.createElement(esClicable ? 'button' : 'span');
      celda.textContent = String(dia);
      celda.className = 'disp-dia' +
        (iso === hoyISO ? ' disp-dia--hoy' : '') +
        (esPasado ? ' disp-dia--pasado' : (disponible ? ' disp-dia--libre' : ' disp-dia--ocupado'));

      if (esClicable) {
        celda.type = 'button';
        celda.setAttribute('aria-label', `Consultar disponibilidad para el ${aFechaBonita(iso)} por WhatsApp`);
        celda.addEventListener('click', () => abrirWhatsAppConFecha(iso));
      }
      grid.appendChild(celda);
    }
  }

  async function cargarMes() {
    estado.textContent = 'Cargando disponibilidad…';
    estado.classList.remove('hidden');
    gridWrap.classList.add('hidden');

    mesLabel.textContent = `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`;
    btnPrev.disabled = cursor.getTime() <= primerMesPermitido.getTime();
    btnNext.disabled = cursor.getTime() >= ultimoMesPermitido.getTime();

    const desde = aISO(cursor);
    const finDeMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const hasta = aISO(finDeMes);

    let filas;
    try {
      const { data, error } = await sb.rpc('disponibilidad_publica', { desde, hasta });
      if (error) throw error;
      filas = data || [];
    } catch (err) {
      estado.textContent = 'No se ha podido cargar la disponibilidad ahora mismo. Escríbenos por WhatsApp y te la confirmamos al momento.';
      return;
    }

    const disponiblePorFecha = {};
    filas.forEach((f) => { disponiblePorFecha[f.fecha] = f.disponible; });

    pintarGrid(cursor, disponiblePorFecha);
    estado.classList.add('hidden');
    gridWrap.classList.remove('hidden');
  }

  btnPrev.addEventListener('click', () => {
    if (cursor.getTime() <= primerMesPermitido.getTime()) return;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    cargarMes();
  });
  btnNext.addEventListener('click', () => {
    if (cursor.getTime() >= ultimoMesPermitido.getTime()) return;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    cargarMes();
  });

  cargarMes();
}
