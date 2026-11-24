/* Dilia packing and documents engine (pure functions).
   build(): a packing list from trip length and trip types. Our own generic lists, no outside data.
   expiry(): how many days until a document expires and how urgent that is. */
(function (root) {
  const CATS = ['Documents', 'Clothes', 'Toiletries', 'Electronics', 'Health', 'Extras', 'Before you leave'];
  const TYPES = { beach: 'Beach', city: 'City break', business: 'Business', cold: 'Cold weather', hiking: 'Hiking and outdoors', kids: 'Travelling with children', flight: 'Flying' };
  const BASE = [
    ['Documents', ['Passport or ID', 'Visa or entry permit if needed', 'Boarding passes or tickets', 'Hotel or stay confirmation', 'Travel insurance details', 'Some local cash and a card', 'Copies of key documents']],
    ['Toiletries', ['Toothbrush and toothpaste', 'Deodorant', 'Shampoo and soap', 'Hairbrush or comb']],
    ['Electronics', ['Phone and charger', 'Power bank', 'Plug adapter if needed', 'Headphones']],
    ['Health', ['Personal medicines', 'Pain relief and basic first aid']],
    ['Before you leave', ['Check passport validity and entry rules', 'Tell your bank you are travelling', 'Download offline maps and tickets', 'Charge devices', 'Lock windows and doors', 'Take out the rubbish and empty the fridge of perishables', 'Switch off or unplug what you can', 'Check in online and weigh your bags']]
  ];
  const BY = {
    beach: [['Clothes', ['Swimwear', 'Sandals or flip-flops', 'Sun hat', 'Light cover-up']], ['Toiletries', ['Sunscreen', 'After-sun lotion']], ['Extras', ['Sunglasses', 'Beach towel', 'Waterproof phone pouch']]],
    city: [['Clothes', ['Comfortable walking shoes', 'One smarter outfit', 'Light jacket or umbrella']], ['Extras', ['Day bag', 'Reusable water bottle']]],
    business: [['Clothes', ['Business outfits', 'Formal shoes', 'Belt and tie or scarf']], ['Electronics', ['Laptop and charger', 'Presentation clicker or adapters']], ['Extras', ['Business cards', 'Notebook and pen']]],
    cold: [['Clothes', ['Warm coat', 'Thermal layers', 'Gloves', 'Warm hat', 'Scarf', 'Warm socks', 'Waterproof boots']], ['Toiletries', ['Moisturiser and lip balm']]],
    hiking: [['Clothes', ['Hiking boots', 'Rain jacket', 'Quick-dry layers', 'Hiking socks']], ['Health', ['Blister plasters', 'Insect repellent']], ['Extras', ['Daypack', 'Water bottle', 'Snacks', 'Torch or headlamp', 'Offline trail map']]],
    kids: [['Clothes', ['Spare clothes for each child', 'Comfort toy or blanket']], ['Health', ['Children\'s medicines', 'Thermometer']], ['Extras', ['Snacks and drinks', 'Games, books or tablet for the journey', 'Wet wipes', 'Nappies or spare underwear']], ['Documents', ['Children\'s passports and any consent letters']]],
    flight: [['Extras', ['Neck pillow and eye mask', 'Empty bottle to fill after security', 'Liquids in small containers in a clear bag']], ['Electronics', ['Downloaded films, music or books']]]
  };
  function build(o) {
    const days = Math.max(1, Math.min(60, Math.floor(+o.days) || 1)), types = (o.types || []).filter(t => BY[t]), out = [], seen = new Set();
    const add = (c, t) => { const k = c + '|' + t.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push({ c, t }); } };
    const tops = Math.min(days, 7), socks = Math.min(days + 1, 8);
    add('Clothes', tops + ' × tops or T-shirts'); add('Clothes', Math.max(1, Math.ceil(days / 3)) + ' × trousers or skirts, capped at 4'.replace(/ × (.*), capped at 4/, ''));
    out[out.length - 1].t = Math.min(4, Math.max(1, Math.ceil(days / 3))) + ' × trousers, skirts or shorts';
    add('Clothes', socks + ' × underwear'); add('Clothes', socks + ' × socks'); add('Clothes', 'Sleepwear'); add('Clothes', 'Comfortable shoes');
    BASE.forEach(([c, l]) => l.forEach(t => add(c, t)));
    types.forEach(k => BY[k].forEach(([c, l]) => l.forEach(t => add(c, t))));
    if (days > 7) add('Clothes', 'Laundry bag or plan to wash clothes');
    return out.sort((a, b) => CATS.indexOf(a.c) - CATS.indexOf(b.c));
  }
  // dates as yyyy-mm-dd, today as yyyy-mm-dd. level: expired, urgent (<=30 days), soon (<=90), watch (<=180), ok.
  const num = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return NaN; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d.getTime() / 864e5 : NaN; };
  function expiry(exp, today) { const a = num(exp), b = num(today); if (isNaN(a) || isNaN(b)) return null; const d = a - b; return { days: d, level: d < 0 ? 'expired' : d <= 30 ? 'urgent' : d <= 90 ? 'soon' : d <= 180 ? 'watch' : 'ok' }; }
  // does the document still count after the trip ends plus a margin in months (some countries ask for 6 months after arrival or departure)
  function validFor(exp, tripEnd, months) { const a = num(exp), b = num(tripEnd); if (isNaN(a) || isNaN(b)) return null; const s0 = new Date(b * 864e5), y = s0.getUTCFullYear(), m = s0.getUTCMonth() + (months || 0), ty = y + Math.floor(m / 12), tm = ((m % 12) + 12) % 12, last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate(), d = Date.UTC(ty, tm, Math.min(s0.getUTCDate(), last)); return a >= d / 864e5; }
  root.DiliaPack = { CATS, TYPES, build, expiry, validFor, num };
  if (typeof module !== 'undefined') module.exports = root.DiliaPack;
})(typeof window !== 'undefined' ? window : globalThis);
