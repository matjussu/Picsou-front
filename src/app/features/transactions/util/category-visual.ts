import {
  ArrowDownLeft,
  BookOpen,
  Briefcase,
  Car,
  Circle,
  CreditCard,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  Home,
  LucideIconData,
  MonitorPlay,
  RotateCcw,
  Shirt,
  ShoppingCart,
  Utensils,
} from 'lucide-angular';

/**
 * Source unique de vérité pour le visuel des catégories.
 * Les clés `iconKey` / `colorKey` correspondent au seed backend
 * `V2__seed_categories.sql`. Réutilisé par la table et le dialog
 * pour garder icônes + couleurs cohérentes partout.
 */
const ICONS: Record<string, LucideIconData> = {
  home: Home,
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  gamepad: Gamepad2,
  car: Car,
  play: MonitorPlay,
  heart: Heart,
  shirt: Shirt,
  book: BookOpen,
  gift: Gift,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  'rotate-ccw': RotateCcw,
  'arrow-down': ArrowDownLeft,
  circle: Circle,
};

const COLORS: Record<string, string> = {
  blue: '#3B82F6',
  green: '#22C55E',
  orange: '#F97316',
  purple: '#A855F7',
  red: '#EF4444',
  pink: '#EC4899',
  rose: '#F43F5E',
  amber: '#F59E0B',
  teal: '#14B8A6',
  fuchsia: '#D946EF',
  lime: '#84CC16',
  cyan: '#06B6D4',
  sky: '#0EA5E9',
  emerald: '#10B981',
  slate: '#64748B',
};

/** Icône lucide d'une catégorie (fallback : carte bancaire générique). */
export function categoryIcon(iconKey: string | null | undefined): LucideIconData {
  return (iconKey && ICONS[iconKey]) || CreditCard;
}

/**
 * Couleur d'accent + fond teinté translucide d'une catégorie.
 * `color-mix` donne un fond qui reste lisible en thème clair ET sombre
 * sans dupliquer la palette par thème.
 */
export function categoryColor(colorKey: string | null | undefined): {
  fg: string;
  bg: string;
} {
  const fg = (colorKey && COLORS[colorKey]) || 'var(--text-secondary)';
  return { fg, bg: `color-mix(in srgb, ${fg} 15%, transparent)` };
}
