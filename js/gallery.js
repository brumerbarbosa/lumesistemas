(() => {
  const section = document.querySelector('[data-screen-label="Galeria"]');
  const deck = section?.querySelector('.g3');
  const cards = deck ? [...deck.children] : [];

  if (cards.length < 3) return;

  cards.forEach((card) => card.classList.add('gallery-card'));

  const setInitialStack = () => {
    cards[0].classList.add('is-front');
    cards[1].classList.add('is-middle');
    cards[2].classList.add('is-back');
  };

  setInitialStack();

  const advanceStack = () => {
    const front = cards.find((card) => card.classList.contains('is-front'));
    const middle = cards.find((card) => card.classList.contains('is-middle'));
    const back = cards.find((card) => card.classList.contains('is-back'));

    if (!front || !middle || !back) return;

    front.classList.remove('is-front');
    front.classList.add('is-leaving');

    middle.classList.remove('is-middle');
    middle.classList.add('is-front');

    back.classList.remove('is-back');
    back.classList.add('is-middle');

    window.setTimeout(() => {
      front.classList.remove('is-leaving');
      front.classList.add('is-back');
    }, 820);
  };

  window.setTimeout(() => {
    advanceStack();
    window.setInterval(advanceStack, 3600);
  }, 2600);
})();
