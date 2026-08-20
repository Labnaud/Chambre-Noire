import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import type { FormEvent } from 'react';
import type { ShotLog, Rating, SavedRecipe, BeanProfile, FavoritesMap, MaintenanceEvent, CaffeineEntry } from './types';
import { generateId } from './lib/format';
import { getLogMessage } from './lib/milestones';
import { getSuggestedSettings } from './lib/suggestions';
import { getMaintenanceAlerts } from './lib/maintenance';
import { RATINGS, RATING_COLORS, BALANCED_RATING_INDEX, GRIND_MIN, GRIND_MAX } from './constants';
import { useToast, useConfirm, useTimer, useShots, useBeans, useRecipes, useFavorites, useTheme, useShotForm, useKeyboardShortcuts, useBeanAutocomplete, useMaintenance, useScrollLock, useIntake, useCaffeinePrefs, useCaffeineExclusions } from './hooks';
import Icons from './components/Icons';
import Header from './components/Header';
import ShotForm from './components/ShotForm/ShotForm';
import ConfirmDialog from './components/modals/ConfirmDialog';
import ShotDetailModal from './components/modals/ShotDetailModal';
import { buildJSONBackup, buildCSV, downloadFile, parseImportFile } from './lib/dataIO';
import type { ImportResult } from './lib/dataIO';
import Toast from './components/Toast';
import ShotHistory from './components/ShotHistory';
import ShotComparison from './components/ShotComparison';
import { RATING_COLOR_CLASS } from './lib/ratings';
import { saveStorageValue } from './lib/storage';
import { getRecentShotsForBean } from './lib/shots';
import { profileFor, describeBrew } from './lib/brew';

const RecipeEditorModal = lazy(() => import('./components/modals/RecipeEditorModal'));
const BeanLibraryModal = lazy(() => import('./components/modals/BeanLibraryModal'));
const RecipeLibraryModal = lazy(() => import('./components/modals/RecipeLibraryModal'));
const StatsModal = lazy(() => import('./components/modals/StatsModal'));
const CaffeineModal = lazy(() => import('./components/modals/CaffeineModal'));
const HistoryModal = lazy(() => import('./components/modals/HistoryModal'));
const SettingsModal = lazy(() => import('./components/modals/SettingsModal'));

const RATING_CONFIG: Record<Rating, { icon: () => React.JSX.Element; colorClass: string }> = {
  'Very Sour': { icon: Icons.DoubleChevronLeft, colorClass: RATING_COLOR_CLASS['Very Sour'] },
  'Sour': { icon: Icons.Citrus, colorClass: RATING_COLOR_CLASS.Sour },
  'Balanced': { icon: Icons.Sparkles, colorClass: RATING_COLOR_CLASS.Balanced },
  'Bitter': { icon: Icons.Flame, colorClass: RATING_COLOR_CLASS.Bitter },
  'Very Bitter': { icon: Icons.DoubleChevronRight, colorClass: RATING_COLOR_CLASS['Very Bitter'] },
};

function App() {
  const form = useShotForm();

  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [editingRecipe, setEditingRecipe] = useState<SavedRecipe | null>(null);
  const [selectedShot, setSelectedShot] = useState<ShotLog | null>(null);
  const [editingShot, setEditingShot] = useState<ShotLog | null>(null);
  const [showBeanLibrary, setShowBeanLibrary] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showRecipeLibrary, setShowRecipeLibrary] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [importBackup, setImportBackup] = useState<{
    shots: ShotLog[];
    recipes: SavedRecipe[];
    beans: BeanProfile[];
    favorites: FavoritesMap;
    maintenance: MaintenanceEvent[];
    intake: CaffeineEntry[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCaffeine, setShowCaffeine] = useState(false);
  const [beanFilter, setBeanFilter] = useState<string>('');
  const [notesSearch, setNotesSearch] = useState<string>('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [compareShots, setCompareShots] = useState<[string | null, string | null]>([null, null]);

  const { confirmDialog, showConfirm, closeConfirm } = useConfirm();
  const { toast, showToast, hideToast } = useToast(3000);
  const { timerRunning, timerSeconds, startTimer, stopTimer, resetTimer } = useTimer();
  const { shots, addShot, updateShot, deleteShot, replaceAll: setShots } = useShots();
  const { beans, addBean, updateBean, deleteBean, toggleActive, replaceAll: setBeans } = useBeans();
  const { recipes, pinned: pinnedRecipes, addRecipe, updateRecipe, deleteRecipe, togglePin: togglePinRecipe, replaceAll: setRecipes } = useRecipes();
  const { favorites, toggleFavorite, replaceAll: setFavorites } = useFavorites();
  const { theme, setTheme, use24Hour, setUse24Hour, cycleTheme } = useTheme();
  const { events: maintenanceEvents, recordCleaning, recordDescaling, lastEventFor: lastMaintenanceFor, replaceAll: setMaintenance } = useMaintenance();
  const { entries: intake, addEntry: addIntake, deleteEntry: deleteIntake, replaceAll: setIntake } = useIntake();
  const { prefs: caffeinePrefs, setPref: setCaffeinePref } = useCaffeinePrefs();
  const { excluded: excludedShots, exclude: excludeShot, restore: restoreShot, replaceAll: setExcludedShots } = useCaffeineExclusions();

  const autocomplete = useBeanAutocomplete(beans, shots);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [justLoggedId, setJustLoggedId] = useState<string | null>(null);

  useEffect(() => {
    if (!justLoggedId) return;
    const t = setTimeout(() => setJustLoggedId(null), 1600);
    return () => clearTimeout(t);
  }, [justLoggedId]);

  const [showShortcuts, setShowShortcuts] = useState(() => {
    const stored = localStorage.getItem('chambre-noire-show-shortcuts');
    return stored === null ? false : stored === 'true';
  });

  useEffect(() => {
    const onStorageError = () =>
      showToast('Storage full. Your latest change was not saved. Export a backup.', 'error');
    window.addEventListener('chambre-noire:storage-error', onStorageError);
    return () => window.removeEventListener('chambre-noire:storage-error', onStorageError);
  }, [showToast]);

  const rating = RATINGS[form.ratingIndex];

  const anyModalOpen =
    showRecipeModal || showRecipeLibrary || showBeanLibrary || showStats || showCaffeine
    || showSettings || showHistoryModal || selectedShot !== null || editingRecipe !== null
    || confirmDialog !== null;
  useScrollLock(anyModalOpen);

  useKeyboardShortcuts({
    canSubmit: () =>
      !showRecipeModal && !showRecipeLibrary && !showBeanLibrary && !showStats && !showCaffeine
      && !showSettings && !selectedShot && !editingRecipe
      && form.beanName.trim() !== '',
    onSubmit: () => {
      const f = document.querySelector('.shot-form') as HTMLFormElement | null;
      f?.requestSubmit();
    },
    onCycleTheme: cycleTheme,
    onToggleBeanLibrary: () => setShowBeanLibrary(prev => !prev),
    onEscape: () => {
      if (confirmDialog) closeConfirm();
      else if (selectedShot) setSelectedShot(null);
      else if (editingRecipe) setEditingRecipe(null);
      else if (showHistoryModal) setShowHistoryModal(false);
      else if (showBeanLibrary) setShowBeanLibrary(false);
      else if (showRecipeLibrary) setShowRecipeLibrary(false);
      else if (showStats) setShowStats(false);
      else if (showCaffeine) setShowCaffeine(false);
      else if (showRecipeModal) setShowRecipeModal(false);
      else if (showSettings) setShowSettings(false);
    },
  });

  const currentBeanKey = form.beanName.trim().toLowerCase();
  const favoriteId = favorites[currentBeanKey];
  const favoriteShot = favoriteId ? shots.find(s => s.id === favoriteId) : null;

  // Scoped to the selected method so V60 advice never comes from espresso history.
  const shotsForBean = getRecentShotsForBean(shots, form.beanName, 5, form.method);
  const lastShotForBean = shotsForBean[0] ?? null;

  const suggestedSettings = getSuggestedSettings(lastShotForBean);

  // A documented starting point for a bean with no history yet.
  const applyStartingPoint = (doseIn: number, doseOut: number, grind: number) => {
    form.setGrindSize(grind);
    form.setShowDose(true);
    form.setDoseIn(String(doseIn));
    form.setDoseOut(String(doseOut));
    showToast('Starting point loaded', 'success');
  };

  const applySuggestedSettings = () => {
    if (!suggestedSettings || !lastShotForBean) return;
    form.applyFromShot(lastShotForBean);
    form.setGrindSize(suggestedSettings.grindSize);
    form.setWaterTempC(suggestedSettings.waterTempC);
    if (suggestedSettings.doseOut !== undefined) {
      form.setShowDose(true);
      form.setDoseOut(String(suggestedSettings.doseOut));
    }
    form.setRatingIndex(BALANCED_RATING_INDEX);
    form.setRated(true);
  };

  const saveAsRecipe = () => {
    if (!recipeName.trim() || !form.beanName.trim()) return;

    const newRecipe: SavedRecipe = {
      id: generateId(),
      name: recipeName.trim(),
      beanName: form.beanName.trim(),
      method: form.method,
      pourPattern: profileFor(form.method).hasPourPattern ? form.pourPattern : undefined,
      iced: form.iced || undefined,
      basket: form.basket,
      grindSize: form.grindSize,
      waterTempC: form.waterTempC,
      strength: form.strength,
      drink: form.showDrink ? form.drink : undefined,
      milkType: form.showDrink ? form.milkType : undefined,
      notes: form.notes.trim() || undefined,
      createdAt: new Date(),
    };

    addRecipe(newRecipe);
    setShowRecipeModal(false);
    setRecipeName('');
  };

  const confirmDeleteRecipe = (id: string) => {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;

    showConfirm(
      'Delete Recipe',
      `Are you sure you want to delete "${recipe.name}"?`,
      () => {
        deleteRecipe(id);
        showToast('Recipe deleted', 'info');
      }
    );
  };

  const openEditRecipe = (recipe: SavedRecipe) => {
    setEditingRecipe(recipe);
    setRecipeName(recipe.name);
    form.applyFromRecipe(recipe);
    setShowRecipeLibrary(false);
    setShowRecipeModal(true);
  };

  const submitRecipeEdits = () => {
    if (!editingRecipe || !recipeName.trim()) return;

    const updated: SavedRecipe = {
      ...editingRecipe,
      name: recipeName.trim(),
      beanName: form.beanName,
      method: form.method,
      pourPattern: profileFor(form.method).hasPourPattern ? form.pourPattern : undefined,
      iced: form.iced || undefined,
      basket: form.basket,
      grindSize: form.grindSize,
      waterTempC: form.waterTempC,
      strength: form.strength,
      drink: form.showDrink ? form.drink : undefined,
      milkType: form.showDrink ? form.milkType : undefined,
      notes: form.notes.trim() || undefined,
    };

    updateRecipe(updated);
    setEditingRecipe(null);
    setRecipeName('');
    showToast('Recipe updated', 'success');
  };

  const toggleCompareShot = (id: string) => {
    setCompareShots(prev => {
      if (prev[0] === id) return [null, prev[1]];
      if (prev[1] === id) return [prev[0], null];
      if (prev[0] === null) return [id, prev[1]];
      if (prev[1] === null) return [prev[0], id];
      return [prev[1], id]; // replace oldest
    });
  };

  const shot1 = compareShots[0] ? shots.find(s => s.id === compareShots[0]) : null;
  const shot2 = compareShots[1] ? shots.find(s => s.id === compareShots[1]) : null;

  const confirmDeleteShot = (id: string) => {
    const shot = shots.find(s => s.id === id);
    if (!shot) return;

    showConfirm(
      'Delete Shot',
      `Are you sure you want to delete this shot for "${shot.beanName}"?`,
      () => {
        const beanKey = shot.beanName.toLowerCase();
        if (favorites[beanKey] === id) {
          const updated = { ...favorites };
          delete updated[beanKey];
          setFavorites(updated);
        }
        deleteShot(id);
        showToast('Shot deleted', 'info');
      }
    );
  };

  const duplicateShot = (shot: ShotLog) => {
    form.applyFromShot(shot);
    form.setRatingIndex(BALANCED_RATING_INDEX);
    form.setRated(true);
  };

  const applyBestDialIn = (shot: ShotLog) => {
    form.applyFromShot(shot);
    form.setRatingIndex(BALANCED_RATING_INDEX);
    form.setRated(true);
    setShowBeanLibrary(false);
    showToast(`Loaded best dial-in for ${shot.beanName}`, 'success');
  };

  const rateShot = (shotId: string, rating: Rating) => {
    const shot = shots.find(s => s.id === shotId);
    if (!shot) return;
    updateShot({ ...shot, rating });
    setSelectedShot(prev => (prev && prev.id === shotId ? { ...prev, rating } : prev));
    showToast(`Rated ${rating}`, 'success');
  };

  // Shared by logging and editing, so an edit cannot silently keep the old time.
  const readExtractionTime = (): number | undefined => {
    if (form.manualTimeInput) {
      const parsed = parseFloat(form.manualTimerValue);
      return parsed > 0 ? Math.round(parsed * 10) / 10 : undefined;
    }
    return timerSeconds > 0 ? Math.round(timerSeconds * 10) / 10 : undefined;
  };

  const openEditShot = (shot: ShotLog) => {
    form.applyFromShot(shot);
    const ratingIdx = shot.rating ? RATINGS.indexOf(shot.rating) : -1;
    form.setRated(ratingIdx >= 0);
    form.setRatingIndex(ratingIdx >= 0 ? ratingIdx : BALANCED_RATING_INDEX);
    form.setDoseIn(shot.doseIn?.toString() ?? '');
    form.setDoseOut(shot.doseOut?.toString() ?? '');
    form.setShowTimer(true);
    form.setManualTimeInput(true);
    form.setManualTimerValue(shot.extractionTime?.toString() ?? '');
    setEditingShot(shot);
    setShowHistoryModal(false);
    showToast('Editing shot - make changes and click Update Shot', 'info');
  };

  const submitShotEdits = () => {
    if (!editingShot || !form.beanName.trim()) return;

    const updated: ShotLog = {
      ...editingShot,
      beanName: form.beanName.trim(),
      method: form.method,
      pourPattern: profileFor(form.method).hasPourPattern ? form.pourPattern : undefined,
      iced: form.iced || undefined,
      iceGrams: form.iced && form.iceGrams ? parseFloat(form.iceGrams) : undefined,
      basket: form.basket,
      grindSize: form.grindSize,
      waterTempC: form.waterTempC,
      strength: form.strength,
      rating: form.rated ? rating : undefined,
      score: form.scored ? form.score : undefined,
      drink: form.showDrink ? form.drink : undefined,
      milkType: form.showDrink ? form.milkType : undefined,
      milkMl: form.showDrink && form.milkMl ? parseFloat(form.milkMl) : undefined,
      milkTempC: form.showDrink && form.milkTempC ? parseFloat(form.milkTempC) : undefined,
      waterMl: form.showDrink && form.waterMl ? parseFloat(form.waterMl) : undefined,
      notes: form.notes.trim() || undefined,
      sessionLog: form.sessionLog.trim() || undefined,
      doseIn: form.doseIn ? parseFloat(form.doseIn) : undefined,
      doseOut: form.doseOut ? parseFloat(form.doseOut) : undefined,
      extractionTime: readExtractionTime(),
    };

    updateShot(updated);

    const oldBeanKey = editingShot.beanName.toLowerCase();
    const newBeanKey = form.beanName.trim().toLowerCase();
    if (oldBeanKey !== newBeanKey && favorites[oldBeanKey] === editingShot.id) {
      const updatedFavorites = { ...favorites };
      delete updatedFavorites[oldBeanKey];
      updatedFavorites[newBeanKey] = editingShot.id;
      setFavorites(updatedFavorites);
    }

    setEditingShot(null);
    showToast('Shot updated', 'success');
  };

  const confirmDeleteBean = (id: string) => {
    const bean = beans.find(b => b.id === id);
    if (!bean) return;

    showConfirm(
      'Delete Bean',
      `Are you sure you want to delete "${bean.name}"?`,
      () => {
        deleteBean(id);
        showToast('Bean deleted', 'info');
      }
    );
  };

  const exportData = () => {
    const json = buildJSONBackup(shots, recipes, beans, favorites, maintenanceEvents, intake);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(`chambre-noire-backup-${date}.json`, json, 'application/json');
    showToast('Backup exported', 'success');
  };

  const exportToCSV = () => {
    if (shots.length === 0) {
      showToast('No shots to export', 'error');
      return;
    }
    const csv = buildCSV(shots);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(`chambre-noire-shots-${date}.csv`, csv, 'text/csv;charset=utf-8;');
    showToast(`Exported ${shots.length} shots to CSV`, 'success');
  };

  const applyResult = (data: ImportResult) => {
    setShots(data.shots);
    setRecipes(data.recipes);
    setBeans(data.beans);
    setFavorites(data.favorites);
    setMaintenance(data.maintenance);
    setIntake(data.intake);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const previous = { shots, recipes, beans, favorites, maintenance: maintenanceEvents, intake };
      const data = await parseImportFile(file);
      applyResult(data);
      setImportBackup(previous); // enables one-click Undo import
      const skipped = data.skipped.shots + data.skipped.recipes + data.skipped.beans + data.skipped.maintenance + data.skipped.intake;
      let message = `Imported ${data.shots.length} shots, ${data.recipes.length} recipes, ${data.beans.length} beans`;
      if (skipped > 0) message += `; skipped ${skipped} unreadable ${skipped === 1 ? 'entry' : 'entries'}`;
      setImportStatus({ type: 'success', message });
    } catch (err) {
      setImportStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to import file' });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // allow re-selecting same file
    }
  };

  const undoImport = () => {
    if (!importBackup) return;
    setShots(importBackup.shots);
    setRecipes(importBackup.recipes);
    setBeans(importBackup.beans);
    setFavorites(importBackup.favorites);
    setMaintenance(importBackup.maintenance);
    setIntake(importBackup.intake);
    setImportBackup(null);
    setImportStatus({ type: 'success', message: 'Import reverted' });
    showToast('Import reverted', 'info');
  };

  const decrementGrind = () => form.setGrindSize(Math.max(GRIND_MIN, form.grindSize - 1));
  const incrementGrind = () => form.setGrindSize(Math.min(GRIND_MAX, form.grindSize + 1));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.beanName.trim()) return;

    if (editingShot) {
      submitShotEdits();
      form.reset();
      autocomplete.closeSuggestions();
      resetTimer();
      return;
    }

    const newShot: ShotLog = {
      id: generateId(),
      beanName: form.beanName.trim(),
      method: form.method,
      pourPattern: profileFor(form.method).hasPourPattern ? form.pourPattern : undefined,
      iced: form.iced || undefined,
      iceGrams: form.iced && form.iceGrams ? parseFloat(form.iceGrams) : undefined,
      basket: form.basket,
      grindSize: form.grindSize,
      waterTempC: form.waterTempC,
      strength: form.strength,
      rating: form.rated ? rating : undefined,
      score: form.scored ? form.score : undefined,
      drink: form.showDrink ? form.drink : undefined,
      milkType: form.showDrink ? form.milkType : undefined,
      milkMl: form.showDrink && form.milkMl ? parseFloat(form.milkMl) : undefined,
      milkTempC: form.showDrink && form.milkTempC ? parseFloat(form.milkTempC) : undefined,
      waterMl: form.showDrink && form.waterMl ? parseFloat(form.waterMl) : undefined,
      notes: form.notes.trim() || undefined,
      sessionLog: form.sessionLog.trim() || undefined,
      extractionTime: readExtractionTime(),
      doseIn: form.doseIn ? parseFloat(form.doseIn) : undefined,
      doseOut: form.doseOut ? parseFloat(form.doseOut) : undefined,
      timestamp: new Date(),
    };

    addShot(newShot);
    setJustLoggedId(newShot.id);
    const beanShots = shots.filter(s => s.beanName.toLowerCase() === newShot.beanName.toLowerCase()).length + 1;
    form.reset();
    autocomplete.closeSuggestions();
    resetTimer();
    showToast(getLogMessage(shots.length + 1, beanShots, newShot.beanName), 'success');
  };

  const sortedShots = [...shots].sort((a, b) => {
    const aIsFav = favorites[a.beanName.toLowerCase()] === a.id;
    const bIsFav = favorites[b.beanName.toLowerCase()] === b.id;
    if (aIsFav && !bIsFav) return -1;
    if (bIsFav && !aIsFav) return 1;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  const openModal = (setter: (v: boolean) => void) => () => {
    setter(true);
    setMobileMenuOpen(false);
  };

  return (
    <main className="dashboard">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
        onOpenBeanLibrary={openModal(setShowBeanLibrary)}
        onOpenRecipes={openModal(setShowRecipeLibrary)}
        onOpenStats={openModal(setShowStats)}
        onOpenCaffeine={openModal(setShowCaffeine)}
        onOpenSettings={openModal(setShowSettings)}
      />

      {recipes.filter(r => pinnedRecipes.has(r.id)).length > 0 && (
        <div className="recipe-menu">
          <div className="recipe-menu__label">
            <Icons.Star filled /> Quick Recipes
          </div>
          <div className="recipe-menu__chips">
            {recipes
              .filter(recipe => pinnedRecipes.has(recipe.id))
              .map((recipe) => (
                <div key={recipe.id} className="recipe-chip recipe-chip--pinned">
                  <button
                    className="recipe-chip__btn"
                    onClick={() => {
                      form.applyFromRecipe(recipe);
                      showToast(`Applied "${recipe.name}"`, 'success');
                    }}
                    title={`${recipe.beanName} • ${describeBrew(recipe)}${recipe.notes ? ` • ${recipe.notes}` : ''}`}
                  >
                    {recipe.name}
                  </button>
                  <button
                    className="recipe-chip__dismiss"
                    onClick={() => {
                      togglePinRecipe(recipe.id);
                      showToast(`Removed "${recipe.name}" from quick recipes`, 'info');
                    }}
                    title="Remove from quick recipes"
                  >
                    <Icons.X />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="dashboard__grid">
        <div className="card">
          <h2 className="card__title">
            <Icons.Edit /> {editingShot ? 'Edit Shot' : 'Log New Shot'}
          </h2>

          <ShotForm
            form={form}
            timer={{ timerRunning, timerSeconds, startTimer, stopTimer, resetTimer }}
            onSubmit={handleSubmit}
            onIncrementGrind={incrementGrind}
            onDecrementGrind={decrementGrind}
            beans={beans}
            hasAnyBeans={shots.length > 0 || beans.length > 0}
            autocomplete={autocomplete}
            favoriteShot={favoriteShot ?? null}
            editingShot={editingShot}
            onCancelEdit={() => {
              setEditingShot(null);
              form.setBeanName('');
              form.setNotes('');
              form.setSessionLog('');
              form.setDoseIn('');
              form.setDoseOut('');
              showToast('Edit cancelled', 'info');
            }}
            onOpenRecipeModal={() => setShowRecipeModal(true)}
            shots={shots}
            lastShotForBean={lastShotForBean ?? null}
            suggestion={suggestedSettings}
            shotsForBean={shotsForBean}
            ratingConfig={RATING_CONFIG}
            ratingColors={RATING_COLORS}
            onApplySuggestion={applySuggestedSettings}
            onApplyStartingPoint={applyStartingPoint}
          />
        </div>

        <div className="side-panel">
          {getMaintenanceAlerts(maintenanceEvents, shots.length).length > 0 && (
            <div className="card">
              <h2 className="card__title">
                <Icons.Settings /> Machine
              </h2>
              {getMaintenanceAlerts(maintenanceEvents, shots.length).map(alert => (
                <div key={alert.task} className={`maintenance-alert maintenance-alert--${alert.variant}`}>
                  <span className="maintenance-alert__badge">{alert.label}</span>
                  <span className="maintenance-alert__text">{alert.text}</span>
                  <button
                    className="maintenance-alert__action"
                    onClick={() => {
                      if (alert.task === 'cleaning') {
                        recordCleaning(shots.length);
                        showToast('Cleaning logged', 'success');
                      } else {
                        recordDescaling(shots.length);
                        showToast('Descale logged', 'success');
                      }
                    }}
                  >
                    Mark done
                  </button>
                </div>
              ))}
            </div>
          )}

          <ShotHistory
            shots={shots}
            sortedShots={sortedShots}
            favorites={favorites}
            justLoggedId={justLoggedId}
            use24Hour={use24Hour}
            beanFilter={beanFilter}
            setBeanFilter={setBeanFilter}
            notesSearch={notesSearch}
            setNotesSearch={setNotesSearch}
            ratingConfig={RATING_CONFIG}
            onSelectShot={setSelectedShot}
            onToggleFavorite={toggleFavorite}
            onEditShot={openEditShot}
            onDeleteShot={confirmDeleteShot}
            onOpenHistoryModal={() => setShowHistoryModal(true)}
          />
        </div>
      </div>

      {(showRecipeModal || editingRecipe !== null) && (
        <Suspense fallback={null}>
          <RecipeEditorModal
            open={true}
            form={form}
            recipeName={recipeName}
            setRecipeName={setRecipeName}
            editingRecipe={editingRecipe}
            onSave={() => editingRecipe ? submitRecipeEdits() : saveAsRecipe()}
            onCancel={() => { setShowRecipeModal(false); setEditingRecipe(null); setRecipeName(''); }}
          />
        </Suspense>
      )}

      <ShotDetailModal
        shot={selectedShot}
        use24Hour={use24Hour}
        isFavorite={!!selectedShot && favorites[selectedShot.beanName.toLowerCase()] === selectedShot.id}
        isCompared={!!selectedShot && compareShots.includes(selectedShot.id)}
        ratingConfig={RATING_CONFIG}
        onClose={() => setSelectedShot(null)}
        onEdit={openEditShot}
        onDelete={confirmDeleteShot}
        onDuplicate={duplicateShot}
        onRate={rateShot}
        onToggleCompare={(id) => {
          const wasCompared = compareShots.includes(id);
          toggleCompareShot(id);
          showToast(wasCompared ? 'Removed from comparison' : 'Added to comparison', 'info');
        }}
      />

      <Suspense fallback={null}>
        {showBeanLibrary && (
          <BeanLibraryModal
            open={true}
            beans={beans}
            shots={shots}
            method={form.method}
            onAdd={addBean}
            onUpdate={updateBean}
            onDelete={confirmDeleteBean}
            onToggleActive={toggleActive}
            onApplyDialIn={applyBestDialIn}
            onClose={() => setShowBeanLibrary(false)}
          />
        )}

        {showRecipeLibrary && (
          <RecipeLibraryModal
            open={true}
            recipes={recipes}
            pinnedRecipes={pinnedRecipes}
            onApply={(recipe) => {
              form.applyFromRecipe(recipe);
              setShowRecipeLibrary(false);
              showToast(`Applied "${recipe.name}"`, 'success');
            }}
            onEdit={openEditRecipe}
            onDelete={confirmDeleteRecipe}
            onTogglePin={(recipe, wasStarred) => {
              togglePinRecipe(recipe.id);
              showToast(
                wasStarred
                  ? `Removed "${recipe.name}" from quick recipes`
                  : `Added "${recipe.name}" to quick recipes`,
                wasStarred ? 'info' : 'success'
              );
            }}
            onClose={() => setShowRecipeLibrary(false)}
          />
        )}

        {showStats && (
          <StatsModal
            open={true}
            shots={shots}
            onClose={() => setShowStats(false)}
          />
        )}

        {showCaffeine && (
          <CaffeineModal
            open={true}
            shots={shots}
            intake={intake}
            prefs={caffeinePrefs}
            setPref={setCaffeinePref}
            onAddIntake={addIntake}
            onDeleteIntake={deleteIntake}
            excludedShots={excludedShots}
            onExcludeShot={excludeShot}
            onRestoreShot={restoreShot}
            onClose={() => setShowCaffeine(false)}
          />
        )}

        {showHistoryModal && (
          <HistoryModal
            open={true}
            shots={shots}
            sortedShots={sortedShots}
            favorites={favorites}
            beanFilter={beanFilter}
            setBeanFilter={setBeanFilter}
            notesSearch={notesSearch}
            setNotesSearch={setNotesSearch}
            use24Hour={use24Hour}
            ratingConfig={RATING_CONFIG}
            compareShots={compareShots}
            onClose={() => setShowHistoryModal(false)}
            onSelectShot={(shot) => setSelectedShot(shot)}
            onToggleFavorite={toggleFavorite}
            onToggleCompare={(id) => {
              const wasCompared = compareShots.includes(id);
              toggleCompareShot(id);
              showToast(wasCompared ? 'Removed from comparison' : 'Added to comparison', 'info');
            }}
            onEditShot={openEditShot}
            onDuplicateShot={duplicateShot}
            onDeleteShot={confirmDeleteShot}
            onRate={rateShot}
          />
        )}

        {showSettings && (
          <SettingsModal
            open={true}
            theme={theme}
            setTheme={setTheme}
            use24Hour={use24Hour}
            setUse24Hour={setUse24Hour}
            shotsCount={shots.length}
            recipesCount={recipes.length}
            beansCount={beans.length}
            importStatus={importStatus}
            canUndoImport={importBackup !== null}
            onUndoImport={undoImport}
            fileInputRef={fileInputRef}
            onExportJSON={exportData}
            onExportCSV={exportToCSV}
            onImport={handleImport}
            onClearAll={() => {
              showConfirm(
                'Clear All Data',
                `Are you sure you want to delete ALL data? This will permanently remove ${shots.length} shots, ${recipes.length} recipes, and ${beans.length} beans. This action cannot be undone.`,
                () => {
                  setShots([]);
                  setRecipes([]);
                  setBeans([]);
                  setFavorites({});
                  setMaintenance([]);
                  setIntake([]);
                  setExcludedShots([]);
                  setImportBackup(null);
                  showToast('All data cleared', 'success');
                  setShowSettings(false);
                }
              );
            }}
            onClose={() => { setShowSettings(false); setImportStatus(null); }}
            lastCleaning={lastMaintenanceFor('cleaning')}
            lastDescaling={lastMaintenanceFor('descaling')}
            onRecordCleaning={() => {
              recordCleaning(shots.length);
              showToast('Cleaning logged', 'success');
            }}
            onRecordDescaling={() => {
              recordDescaling(shots.length);
              showToast('Descale logged', 'success');
            }}
          />
        )}
      </Suspense>

      <ShotComparison
        shot1={shot1}
        shot2={shot2}
        onClear={() => setCompareShots([null, null])}
        onRemoveAt={(idx) => setCompareShots(prev => idx === 0 ? [null, prev[1]] : [prev[0], null])}
      />
      <ConfirmDialog
        dialog={confirmDialog}
        onConfirm={() => {
          confirmDialog?.onConfirm();
          closeConfirm();
        }}
        onClose={closeConfirm}
      />

      <div className={`shortcuts-panel ${showShortcuts ? 'shortcuts-panel--open' : ''}`}>
        {showShortcuts ? (
          <>
            <div className="shortcuts-panel__header">
              <span className="shortcuts-panel__title"><Icons.Keyboard /> Shortcuts</span>
              <button
                className="shortcuts-panel__close"
                onClick={() => {
                  setShowShortcuts(false);
                  saveStorageValue('chambre-noire-show-shortcuts', 'false');
                }}
                title="Hide shortcuts"
              >
                <Icons.X />
              </button>
            </div>
            <div className="shortcuts-panel__list">
              <div className="shortcuts-panel__item">
                <kbd>Ctrl</kbd>+<kbd>Enter</kbd>
                <span>Log Shot</span>
              </div>
              <div className="shortcuts-panel__item">
                <kbd>Ctrl</kbd>+<kbd>B</kbd>
                <span>Bean Library</span>
              </div>
              <div className="shortcuts-panel__item">
                <kbd>Ctrl</kbd>+<kbd>D</kbd>
                <span>Cycle Theme</span>
              </div>
              <div className="shortcuts-panel__item">
                <kbd>Esc</kbd>
                <span>Close Modal</span>
              </div>
            </div>
          </>
        ) : (
          <button
            className="shortcuts-panel__toggle"
            onClick={() => {
              setShowShortcuts(true);
              saveStorageValue('chambre-noire-show-shortcuts', 'true');
            }}
            title="Show keyboard shortcuts"
            aria-label="Show keyboard shortcuts"
          >
            <Icons.Keyboard />
          </button>
        )}
      </div>

      <Toast toast={toast} onDismiss={hideToast} shortcutsOpen={showShortcuts} />
    </main>
  );
}

export default App;
