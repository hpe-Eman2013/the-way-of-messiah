// CommonJS
function normalizeHolyDayDoc(d = {}) {
  const g = (...keys) => keys.reduce((v, k) => (v !== undefined ? v : d[k]), undefined);

  // restrictions may be string or array in your data
  let restrictions = g('restrictions', 'Restrictions');
  if (restrictions === undefined) restrictions = '';
  if (Array.isArray(restrictions)) {
    restrictions = restrictions.join('; ');
  }

  return {
    // unified, safe field names
    name: g('name', 'Name', 'title') || '',
    purpose: g('Purpose', 'purpose', 'Purpose:') || '',
    length: g('Length', 'length') || '',
    restrictions, // string
    when_observed: g('when_observed', 'When Observed', 'whenObserved') || '',
    who_it_was_binding_on:
      g('who_it_was_binding_on', 'Who It Was Binding On', 'whoItWasBindingOn') || '',
    customs: g('Customs', 'customs') || '',
  };
}

module.exports = { normalizeHolyDayDoc };
