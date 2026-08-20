export type ThemeType = 'dark' | 'light' | 'catppuccin' | 'rosepine' | 'rosepine-moon' | 'fadetouched';

export type Basket = 'Single' | 'Double';
export type Strength = 1 | 2 | 3;

export type Rating = 'Very Sour' | 'Sour' | 'Balanced' | 'Bitter' | 'Very Bitter';

// The brewing device. Everything that used to be baked into a flat brew-type
// enum -- whether there is a water temperature, whether the yield number means
// liquid out or total water, whether ratio labels apply -- now lives in the
// per-method profile in lib/brew.ts instead.
export type BrewMethod = 'Espresso' | 'V60' | 'French Press';

// V60 protocol. Orthogonal to whether the brew is served over ice.
export type PourPattern = '2 Pours' | '5 Pours';

// What was built on the shot. Americano carries no milk at all, which is why
// this is a drink and not a milk setting.
export type EspressoDrink =
  | 'Latte' | 'Macchiato' | 'Cortado' | 'Flat White'
  | 'Cappuccino' | 'Mocha' | 'Americano';

export type MilkType = 'Dairy' | 'Plant';

export interface ShotLog {
  id: string;
  beanName: string;
  method: BrewMethod;
  pourPattern?: PourPattern; // V60 only
  iced?: boolean; // hot-brewed onto ice; not a cold brew
  iceGrams?: number; // part of doseOut when iced, so hot water = doseOut - iceGrams
  basket: Basket;
  grindSize: number; // one continuous scale, espresso fine through filter coarse
  waterTempC?: number; // brew water in degrees C
  strength: Strength;
  rating?: Rating; // where the extraction landed on sour <-> bitter
  score?: number; // how good the cup was, 0-5 in half steps; independent of rating
  drink?: EspressoDrink; // what was built on the shot
  milkType?: MilkType;
  milkMl?: number;
  milkTempC?: number;
  waterMl?: number; // Americano
  notes?: string; // short tasting note
  extractionTime?: number; // seconds
  doseIn?: number; // grams of coffee
  doseOut?: number; // liquid out for espresso, total water for filter (see brew profile)
  timestamp: Date;
  isFavorite?: boolean;
}

export interface FavoritesMap {
  [beanName: string]: string; // lowercase bean name -> shot id
}

export interface SavedRecipe {
  id: string;
  name: string;
  beanName: string;
  method: BrewMethod;
  pourPattern?: PourPattern;
  iced?: boolean;
  basket: Basket;
  grindSize: number;
  waterTempC?: number;
  strength: Strength;
  drink?: EspressoDrink;
  milkType?: MilkType;
  notes?: string;
  createdAt: Date;
}

export type ProcessMethod = 'Washed' | 'Natural' | 'Honey' | 'Anaerobic' | 'Other';
export type RoastLevel = 'Light' | 'Medium' | 'Medium-Dark' | 'Dark';

export interface BeanProfile {
  id: string;
  name: string;
  roaster?: string;
  origin?: string;
  roastLevel?: RoastLevel;
  processMethod?: ProcessMethod;
  roastDate?: string; // ISO date
  flavorNotes?: string; // what the roaster prints on the bag
  /**
   * How the bean actually tastes on each method. The same bean reads fruity
   * as a V60 and nutty as an espresso, so this cannot live on the bean alone
   * and cannot live on a single shot either.
   */
  methodNotes?: Partial<Record<BrewMethod, string>>;
  bagSizeGrams?: number; // for inventory + cost-per-shot
  pricePaid?: number; // in the user's own currency
  isActive: boolean;
  createdAt: Date;
}

// A caffeine source that is not a logged shot (tea, cola, energy drink, ...).
export interface CaffeineEntry {
    id: string;
    label: string;
    mg: number;
    timestamp: Date;
}

// Tuning for the half-life forecast. Half-life varies a lot between people,
// so all three are user-adjustable.
export interface CaffeinePrefs {
    halfLifeHours: number;
    bedtime: string; // 'HH:MM'
    targetMg: number; // acceptable level at bedtime
}

export type MaintenanceTask = 'cleaning' | 'descaling';

export interface MaintenanceEvent {
  task: MaintenanceTask;
  performedAt: string; // ISO date
  shotCountAtTime: number;
}

export interface MaintenanceAlert {
  task: MaintenanceTask;
  variant: 'approaching' | 'due' | 'overdue';
  label: string;
  text: string;
}

