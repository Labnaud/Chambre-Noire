import Icons from './Icons';

interface HeaderProps {
    mobileMenuOpen: boolean;
    onToggleMobileMenu: () => void;
    onCloseMobileMenu: () => void;
    onOpenBeanLibrary: () => void;
    onOpenRecipes: () => void;
    onOpenStats: () => void;
    onOpenCaffeine: () => void;
    onOpenSettings: () => void;
}

export default function Header({
    mobileMenuOpen,
    onToggleMobileMenu,
    onCloseMobileMenu,
    onOpenBeanLibrary,
    onOpenRecipes,
    onOpenStats,
    onOpenCaffeine,
    onOpenSettings,
}: HeaderProps) {
    return (
        <header className="header">
            <h1 className="header__title">Chambre Noire</h1>

            <button
                className="header__hamburger"
                onClick={onToggleMobileMenu}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="header-menu"
            >
                {mobileMenuOpen ? <Icons.X /> : <Icons.Menu />}
            </button>

            <div id="header-menu" className={`header__btns ${mobileMenuOpen ? 'header__btns--open' : ''}`}>
                <button
                    className="header__btn"
                    onClick={onOpenBeanLibrary}
                    title="Manage Bean Library"
                >
                    <Icons.Bean /> Bean Library
                </button>
                <button
                    className="header__btn"
                    onClick={onOpenRecipes}
                    title="V60 brew protocols"
                >
                    <Icons.Book /> Brew Guide
                </button>
                <button
                    className="header__btn"
                    onClick={onOpenStats}
                    title="View Statistics"
                >
                    <Icons.PieChart /> Stats
                </button>
                <button
                    className="header__btn"
                    onClick={onOpenCaffeine}
                    title="Caffeine Tracker"
                >
                    <Icons.Caffeine /> Caffeine
                </button>
                <button
                    className="header__btn"
                    onClick={onOpenSettings}
                    title="Settings"
                >
                    <Icons.Sliders /> Settings
                </button>
            </div>

            {mobileMenuOpen && (
                <div
                    className="header__overlay"
                    onClick={onCloseMobileMenu}
                />
            )}
        </header>
    );
}
