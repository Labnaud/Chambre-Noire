// Synthetic demo data for the documentation screenshots.
// Every roaster, bean and shot here is invented. None of it is real logbook data.
const DAY = 86400000;
const base = new Date('2026-08-21T08:10:00Z').getTime();
const at = (daysAgo, hour, min = 0) => {
  const d = new Date(base - daysAgo * DAY);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};

const beans = [
  { id: 'bean-kirinyaga', name: 'Kirinyaga AB', roaster: 'Northwind Roasters',
    origin: 'Kenya', variety: 'SL28, SL34', roastLevel: 'Light', processMethod: 'Washed',
    roastDate: '2026-08-06', flavorNotes: 'Blackcurrant, grapefruit, brown sugar',
    methodNotes: { Espresso: 'Syrupy once the ratio opens past 1:2. Blackcurrant sits on top.',
                   V60: 'Grapefruit and cane sugar, very clean finish.' },
    bagSizeGrams: 250, pricePaid: 19, repurchase: 'Yes', isActive: true, createdAt: at(21, 9) },
  { id: 'bean-esperanza', name: 'Finca La Esperanza', roaster: 'Harbour Lane Coffee',
    origin: 'Colombia', variety: 'Caturra', roastLevel: 'Medium', processMethod: 'Washed',
    roastDate: '2026-08-11', flavorNotes: 'Red apple, panela, milk chocolate',
    methodNotes: { Espresso: 'Forgiving. Holds up well under milk.' },
    bagSizeGrams: 250, pricePaid: 16, repurchase: 'Yes', isActive: true, createdAt: at(14, 10) },
  { id: 'bean-guji', name: 'Guji Highland', roaster: 'Northwind Roasters',
    origin: 'Ethiopia', variety: 'Heirloom', roastLevel: 'Light', processMethod: 'Natural',
    roastDate: '2026-08-13', flavorNotes: 'Peach, jasmine, apricot',
    methodNotes: { V60: 'Peach comes forward on the 5-pour. Flatter on two pours.' },
    bagSizeGrams: 200, pricePaid: 21, repurchase: 'Yes', isActive: true, createdAt: at(10, 8) },
  { id: 'bean-rioverde', name: 'Fazenda Rio Verde', roaster: 'Old Mill Coffee',
    origin: 'Brazil', variety: 'Yellow Bourbon', roastLevel: 'Medium-Dark', processMethod: 'Natural',
    roastDate: '2026-07-18', flavorNotes: 'Peanut, dark chocolate, cocoa nib',
    methodNotes: { Espresso: 'Goes ashy fast. Needed a cooler flush every time.' },
    bagSizeGrams: 500, pricePaid: 14, repurchase: 'No', isActive: false, createdAt: at(32, 11) },
];

let n = 0;
const shot = (o) => ({
  id: `shot-${String(++n).padStart(3, '0')}`, basket: 'Double', strength: 2,
  method: 'Espresso', ...o,
});

const shots = [
  // Kirinyaga: the dial-in arc. Runs fast and sour, grind corrects flow,
  // then yield corrects taste. Four shots to a sweet spot.
  shot({ beanName: 'Kirinyaga AB', grindSize: 22, doseIn: 18, doseOut: 34, extractionTime: 21,
         rating: 'Very Sour', strength: 1, score: 1.5, waterTempC: 93, timestamp: at(6, 8, 5),
         notes: 'Gushed. Thin and sharp.' }),
  shot({ beanName: 'Kirinyaga AB', grindSize: 19, doseIn: 18, doseOut: 36, extractionTime: 26,
         rating: 'Sour', strength: 1, score: 2.5, waterTempC: 93, timestamp: at(5, 8, 15) }),
  shot({ beanName: 'Kirinyaga AB', grindSize: 18, doseIn: 18, doseOut: 36, extractionTime: 30,
         rating: 'Sour', score: 3, waterTempC: 93, timestamp: at(4, 8, 20) }),
  shot({ beanName: 'Kirinyaga AB', grindSize: 18, doseIn: 18, doseOut: 40, extractionTime: 31,
         rating: 'Balanced', score: 4.5, waterTempC: 93, timestamp: at(3, 8, 12),
         notes: 'Blackcurrant finally reads. Syrupy body.', isFavorite: true }),
  shot({ beanName: 'Kirinyaga AB', grindSize: 18, doseIn: 18, doseOut: 40, extractionTime: 32,
         rating: 'Balanced', score: 4, waterTempC: 93, timestamp: at(1, 8, 30) }),
  shot({ beanName: 'Kirinyaga AB', grindSize: 18, doseIn: 18, doseOut: 39, extractionTime: 31,
         rating: 'Balanced', score: 4.5, waterTempC: 93, timestamp: at(0, 8, 10) }),

  // Esperanza: dialled in quickly, mostly drunk with milk.
  shot({ beanName: 'Finca La Esperanza', grindSize: 20, doseIn: 18, doseOut: 34, extractionTime: 24,
         rating: 'Sour', strength: 1, score: 2.5, waterTempC: 92, timestamp: at(9, 7, 40) }),
  shot({ beanName: 'Finca La Esperanza', grindSize: 18, doseIn: 18, doseOut: 36, extractionTime: 29,
         rating: 'Balanced', score: 4, waterTempC: 92, timestamp: at(8, 7, 50),
         notes: 'Panela sweetness, low acidity.', isFavorite: true }),
  shot({ beanName: 'Finca La Esperanza', grindSize: 18, doseIn: 18, doseOut: 36, extractionTime: 28,
         rating: 'Balanced', score: 4, drink: 'Flat White', milkType: 'Dairy', milkMl: 130,
         milkTempC: 62, waterTempC: 92, timestamp: at(2, 7, 45) }),
  shot({ beanName: 'Finca La Esperanza', grindSize: 18, doseIn: 18, doseOut: 36, extractionTime: 29,
         rating: 'Balanced', score: 3.5, drink: 'Cortado', milkType: 'Dairy', milkMl: 60,
         milkTempC: 60, waterTempC: 92, timestamp: at(0, 14, 20) }),

  // Guji: filter only, both pour patterns, one served over ice.
  shot({ beanName: 'Guji Highland', method: 'V60', pourPattern: '2 Pours', grindSize: 68,
         doseIn: 15, doseOut: 250, extractionTime: 195, waterTempC: 94, rating: 'Sour',
         strength: 1, score: 3, timestamp: at(7, 9, 30) }),
  shot({ beanName: 'Guji Highland', method: 'V60', pourPattern: '5 Pours', grindSize: 64,
         doseIn: 15, doseOut: 250, extractionTime: 205, waterTempC: 94, rating: 'Balanced',
         score: 4.5, notes: 'Peach and jasmine, syrupy for a filter.', isFavorite: true,
         timestamp: at(5, 9, 20) }),
  shot({ beanName: 'Guji Highland', method: 'V60', pourPattern: '5 Pours', grindSize: 64,
         doseIn: 15, doseOut: 250, extractionTime: 200, waterTempC: 94, rating: 'Balanced',
         score: 4, timestamp: at(2, 9, 25) }),
  shot({ beanName: 'Guji Highland', method: 'V60', pourPattern: '2 Pours', grindSize: 64,
         iced: true, iceGrams: 100, doseIn: 15, doseOut: 250, extractionTime: 190,
         waterTempC: 94, rating: 'Balanced', score: 4, timestamp: at(1, 13, 0) }),

  // Rio Verde: retired. Never got past bitter, hence buy-again "No".
  shot({ beanName: 'Fazenda Rio Verde', grindSize: 17, doseIn: 18, doseOut: 36, extractionTime: 34,
         rating: 'Very Bitter', strength: 3, score: 1.5, waterTempC: 91, timestamp: at(28, 8),
         notes: 'Ashy. Cooling flush did not save it.' }),
  shot({ beanName: 'Fazenda Rio Verde', grindSize: 19, doseIn: 18, doseOut: 38, extractionTime: 30,
         rating: 'Bitter', score: 2, waterTempC: 90, timestamp: at(26, 8, 10) }),
];

const favorites = {};
for (const s of shots) if (s.isFavorite) favorites[s.beanName.toLowerCase()] = s.id;

const intake = [
  { id: 'intake-1', label: 'Green tea', mg: 28, timestamp: at(0, 11, 0) },
];

export const seed = {
  'chambre-noire-beans': beans,
  'chambre-noire-shots': shots,
  'chambre-noire-favorites': favorites,
  'chambre-noire-intake': intake,
  'chambre-noire-show-shortcuts': 'false',
};

// Also usable directly: `node scripts/demo-seed.mjs > seed.json`
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(seed, null, 2));
}
