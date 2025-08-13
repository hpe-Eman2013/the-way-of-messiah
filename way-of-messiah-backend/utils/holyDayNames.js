// CommonJS
const NAME_ALIASES = {
  'sabbath': ['sabbath','weekly sabbath','sabbath day','the sabbath'],
  'feast of weeks (shavuot)': ['feast of weeks', 'shavuot', 'pentecost'],
  'passover (pesach)': ['passover', 'pesach'],
  'feast of unleavened bread': [
    'feast of unleavened bread','unleavened bread','chag hamatzot',
    'first day of unleavened bread','last day of unleavened bread'
  ],
  'feast of trumpets (yom teruah)': ['feast of trumpets', 'yom teruah'],
  'day of atonement (yom haKippurim)': ['day of atonement', 'yom haKippurim', 'yom kippur'],
  'feast of tabernacles (sukkot)': [
  'feast of tabernacles','tabernacles','sukkot','sukkoth','sukkos','booths',
  'the eighth day','last great day'
],

  'feast of dedication (hanukkah)': ['feast of dedication', 'hanukkah', 'chanukah'],
};

function canonicalize(name = '') {
  const n = String(name).trim().toLowerCase();
  for (const [canon, list] of Object.entries(NAME_ALIASES)) {
    if (n === canon || list.includes(n)) return canon;
  }
  return n;
}

module.exports = { NAME_ALIASES, canonicalize };
