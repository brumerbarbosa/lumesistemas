(() => {
  document.querySelectorAll('.roll-button__line').forEach((line) => {
    let characterIndex = 0;

    [...line.childNodes].forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) return;

      const fragment = document.createDocumentFragment();
      [...node.textContent].forEach((character) => {
        const letter = document.createElement('span');
        letter.className = 'roll-char';
        letter.textContent = character;
        letter.style.setProperty('--char-index', characterIndex++);
        fragment.appendChild(letter);
      });
      node.replaceWith(fragment);
    });
  });

  const plansSection = document.querySelector('[data-screen-label="Planos"]');
  const plansCards = plansSection?.querySelector('.g2');
  if (plansCards) {
    const openPlans = () => plansCards.classList.add('is-plans-open');

    if ('IntersectionObserver' in window) {
      const plansObserver = new IntersectionObserver((entries, observer) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        openPlans();
        observer.disconnect();
      }, { threshold: 0.28 });
      plansObserver.observe(plansSection);
    } else {
      openPlans();
    }
  }

  const problemSection = document.querySelector('#problema');
  if (problemSection) {
    problemSection.classList.add('has-problema-animation');

    const revealProblem = () => problemSection.classList.add('is-problema-visible');

    if ('IntersectionObserver' in window) {
      const problemObserver = new IntersectionObserver((entries, observer) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        revealProblem();
        observer.disconnect();
      }, { threshold: 0.24 });
      problemObserver.observe(problemSection.querySelector('.problema-group-01'));
    } else {
      revealProblem();
    }
  }

  const section = document.querySelector('[data-screen-label="Galeria"]');
  const deck = section?.querySelector('.g3');
  const cards = deck ? [...deck.children] : [];

  if (cards.length < 3) return;

  cards.forEach((card) => card.classList.add('gallery-card'));

  const gsap = window.gsap;
  const positions = {
    front: { y: 40, scale: 1 },
    middle: { y: 20, scale: 0.88 },
    back: { y: 0, scale: 0.76 },
  };

  const setInitialStack = () => {
    cards[0].classList.add('is-front');
    cards[1].classList.add('is-middle');
    cards[2].classList.add('is-back');

    if (gsap) {
      cards.forEach((card, index) => {
        const state = index === 0 ? positions.front : index === 1 ? positions.middle : positions.back;
        gsap.set(card, { xPercent: -50, y: state.y, scale: state.scale, opacity: 1 });
      });
    }
  };

  setInitialStack();

  const advanceStack = () => {
    const front = cards.find((card) => card.classList.contains('is-front'));
    const middle = cards.find((card) => card.classList.contains('is-middle'));
    const back = cards.find((card) => card.classList.contains('is-back'));

    if (!front || !middle || !back) return;

    front.classList.remove('is-front');
    middle.classList.remove('is-middle');
    back.classList.remove('is-back');

    if (!gsap) {
      front.classList.add('is-back');
      middle.classList.add('is-front');
      back.classList.add('is-middle');
      return;
    }

    const timeline = gsap.timeline({
      onComplete: () => {
        front.classList.add('is-back');
        middle.classList.add('is-front');
        back.classList.add('is-middle');
      },
    });

    gsap.set(front, { zIndex: 4 });
    gsap.set(middle, { zIndex: 2 });
    gsap.set(back, { zIndex: 1 });

    // 1. A janela da frente sai para baixo e esmaece completamente.
    timeline.to(front, {
      y: 128,
      opacity: 0,
      duration: 0.72,
      ease: 'power2.in',
    });

    // 2. Só depois que ela saiu, as duas janelas seguintes avançam.
    timeline.set(middle, { zIndex: 3 });
    timeline.set(back, { zIndex: 2 });
    timeline.to(middle, {
      y: positions.front.y,
      scale: positions.front.scale,
      duration: 0.68,
      ease: 'power2.out',
    });
    timeline.to(back, {
      y: positions.middle.y,
      scale: positions.middle.scale,
      duration: 0.68,
      ease: 'power2.out',
    }, '<');

    // 3. A janela que saiu reaparece atrás e sobe até o fundo da pilha.
    timeline.set(front, { zIndex: 1, y: 92, scale: positions.back.scale, opacity: 0 });
    timeline.to(front, {
      y: positions.back.y,
      opacity: 1,
      duration: 0.72,
      ease: 'power2.out',
    });
  };

  window.setTimeout(() => {
    const loop = () => {
      advanceStack();
      window.setTimeout(loop, 5200);
    };
    loop();
  }, 2600);
})();
