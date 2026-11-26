(() => {
  'use strict';

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

  // Navegação mobile
  const menuButton = $('.menu-toggle');
  const navigation = $('.nav-links');

  const closeMenu = () => {
    if (!menuButton || !navigation) return;
    navigation.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menu');
  };

  if (menuButton && navigation) {
    menuButton.addEventListener('click', () => {
      const isOpen = navigation.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
      menuButton.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    });

    $$('.nav-links a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  }

  // Filtros da galeria de projetos
  const filters = $$('.filter');
  const projectCards = $$('.project-card');

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.filter;

      filters.forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });

      projectCards.forEach((card) => {
        const shouldHide = category !== 'todos' && card.dataset.category !== category;
        card.classList.toggle('hidden', shouldHide);
      });
    });
  });

  // Barra de leitura e botão de voltar ao topo
  const readingProgress = $('.reading-progress');
  const backToTop = $('.back-to-top');
  let scrollUpdatePending = false;

  const updateScrollUI = () => {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollableHeight > 0
      ? Math.max(0, Math.min(1, window.scrollY / scrollableHeight)) * 100
      : 0;

    if (readingProgress) readingProgress.style.width = `${progress}%`;
    if (backToTop) backToTop.classList.toggle('visible', window.scrollY > 650);
    scrollUpdatePending = false;
  };

  window.addEventListener('scroll', () => {
    if (scrollUpdatePending) return;
    window.requestAnimationFrame(updateScrollUI);
    scrollUpdatePending = true;
  }, { passive: true });
  window.addEventListener('resize', updateScrollUI, { passive: true });
  updateScrollUI();

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Lightbox para ampliar as imagens dos projetos
  const lightbox = $('#lightbox');
  const lightboxImage = $('.lightbox img');
  const lightboxCaption = $('.lightbox-caption');
  const lightboxClose = $('.lightbox-close');
  let previousFocus = null;

  const closeLightbox = () => {
    if (!lightbox || !lightboxImage) return;
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    lightboxImage.removeAttribute('src');
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  };

  const openLightbox = (image) => {
    if (!lightbox || !lightboxImage || !lightboxClose) return;
    previousFocus = document.activeElement;
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt || 'Imagem ampliada';
    if (lightboxCaption) lightboxCaption.textContent = image.alt || '';
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    lightboxClose.focus();
  };

  $$('img[data-zoom]').forEach((image) => {
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', `Ampliar: ${image.alt}`);
    image.addEventListener('click', () => openLightbox(image));
    image.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(image);
      }
    });
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && lightbox?.getAttribute('aria-hidden') === 'false') {
      closeLightbox();
    }
  });
})();

// Calculadora de orçamento: serviços avulsos ou pacotes.
(() => {
  'use strict';

  const section = document.querySelector('#precos');
  if (!section) return;

  const radioModes = Array.from(section.querySelectorAll('input[name="quote-mode"]'));
  const individualOptions = section.querySelector('#quote-individual');
  const packageOptions = section.querySelector('#quote-package');
  const serviceChecks = Array.from(section.querySelectorAll('input[name="quote-service"]'));
  const packageSelect = section.querySelector('#quote-package-select');
  const extraSelect = section.querySelector('#quote-extra');
  const totalOutput = section.querySelector('#quote-total');
  const countOutput = section.querySelector('#quote-count');
  const statusOutput = section.querySelector('#quote-status');
  const copyButton = section.querySelector('#quote-copy');
  const whatsappButton = section.querySelector('#quote-whatsapp');

  if (!individualOptions || !packageOptions || !packageSelect || !extraSelect || !totalOutput || !countOutput) {
    console.warn('Calculadora de orçamento: faltam elementos necessários no HTML.');
    return;
  }

  const formatMoney = (value) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(value);

  let currentMode = 'individual';
  const selectedServices = () => serviceChecks.filter((input) => input.checked);

  const getTotal = () => {
    const subtotal = currentMode === 'package'
      ? Number(packageSelect.selectedOptions[0]?.dataset.price || 0)
      : selectedServices().reduce((sum, input) => sum + Number(input.value), 0);
    return subtotal + Number(extraSelect.value || 0);
  };

  const updateQuote = () => {
    const total = getTotal();
    const selectedCount = selectedServices().length;

    totalOutput.textContent = formatMoney(total);
    countOutput.textContent = currentMode === 'package'
      ? '1 pacote selecionado'
      : `${selectedCount} serviço${selectedCount === 1 ? '' : 's'} selecionado${selectedCount === 1 ? '' : 's'}`;

    if (statusOutput) statusOutput.textContent = '';

    if (whatsappButton) {
      const lines = currentMode === 'package'
        ? [`${packageSelect.selectedOptions[0].dataset.label}: ${formatMoney(Number(packageSelect.selectedOptions[0].dataset.price))}`]
        : selectedServices().map((input) => `${input.dataset.label}: ${formatMoney(Number(input.value))}`);

      const message = [
        'Olá, Carlos! Vi seu portfólio e gostaria de solicitar um orçamento.',
        '',
        ...lines,
        ...(Number(extraSelect.value) ? [`Serviços extras: ${formatMoney(Number(extraSelect.value))}`] : []),
        `Estimativa inicial: ${formatMoney(total)}`,
        'Gostaria de conversar sobre prazo, escopo e disponibilidade.'
      ].join('\n');

      whatsappButton.href = `https://wa.me/5511948093361?text=${encodeURIComponent(message)}`;
    }
  };

  const changeMode = (mode) => {
    currentMode = mode;
    individualOptions.hidden = mode !== 'individual';
    packageOptions.hidden = mode !== 'package';

    const selectedRadio = radioModes.find((input) => input.value === mode);
    if (selectedRadio) selectedRadio.checked = true;
    updateQuote();
  };

  radioModes.forEach((input) => input.addEventListener('change', () => changeMode(input.value)));
  serviceChecks.forEach((input) => input.addEventListener('change', updateQuote));
  packageSelect.addEventListener('change', updateQuote);
  extraSelect.addEventListener('change', updateQuote);

  section.querySelectorAll('.choose-package').forEach((button, index) => {
    button.addEventListener('click', () => {
      packageSelect.value = String(index);
      changeMode('package');
      document.querySelector('#orcamento')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      const lines = currentMode === 'package'
        ? [`${packageSelect.selectedOptions[0].dataset.label}: ${formatMoney(Number(packageSelect.selectedOptions[0].dataset.price))}`]
        : selectedServices().map((input) => `${input.dataset.label}: ${formatMoney(Number(input.value))}`);

      const quoteText = [
        'ORÇAMENTO ESTIMADO — Carlos Henrique Cintra',
        ...lines,
        ...(Number(extraSelect.value) ? [`Adicionais: ${formatMoney(Number(extraSelect.value))}`] : []),
        `Total estimado: ${formatMoney(getTotal())}`,
        'Valores sujeitos à confirmação do escopo do projeto.'
      ].join('\n');

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(quoteText);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = quoteText;
          textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
          document.body.append(textarea);
          textarea.select();
          document.execCommand('copy');
          textarea.remove();
        }
        if (statusOutput) statusOutput.textContent = 'Orçamento copiado! Você já pode enviar para seu cliente.';
      } catch (error) {
        if (statusOutput) statusOutput.textContent = 'Não foi possível copiar automaticamente. Selecione os valores e copie manualmente.';
      }
    });
  }

  changeMode('individual');
})();
