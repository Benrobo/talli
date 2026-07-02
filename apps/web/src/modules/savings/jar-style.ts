import type { IconData } from "@benrobo/iconary/core";
import {
  Airplane01Icon,
  Baby01Icon,
  BirthdayCakeIcon,
  Book01Icon,
  Bus01Icon,
  Camera01Icon,
  Car01Icon,
  Coffee01Icon,
  Diamond01Icon,
  FavouriteCircleIcon,
  FirstAidKitIcon,
  GameController01Icon,
  GiftCard02Icon,
  Home09Icon,
  LaptopAddIcon,
  MountainIcon,
  Mortarboard01Icon,
  PiggyBankIcon,
  Rocket01Icon,
  ShoppingBag01Icon,
  SmartPhone01Icon,
  Store01Icon,
  SunglassesIcon,
  UmbrellaDollarIcon,
  WeddingIcon,
} from "@benrobo/iconary/core/duotone-rounded";

export interface JarIconOption {
  key: string;
  label: string;
  icon: IconData;
}

export const JAR_ICONS: JarIconOption[] = [
  { key: "piggy", label: "Savings", icon: PiggyBankIcon },
  { key: "home", label: "Home", icon: Home09Icon },
  { key: "car", label: "Car", icon: Car01Icon },
  { key: "travel", label: "Travel", icon: Airplane01Icon },
  { key: "gift", label: "Gift", icon: GiftCard02Icon },
  { key: "school", label: "School", icon: Mortarboard01Icon },
  { key: "wedding", label: "Wedding", icon: WeddingIcon },
  { key: "health", label: "Health", icon: FirstAidKitIcon },
  { key: "baby", label: "Baby", icon: Baby01Icon },
  { key: "laptop", label: "Laptop", icon: LaptopAddIcon },
  { key: "phone", label: "Phone", icon: SmartPhone01Icon },
  { key: "business", label: "Business", icon: Store01Icon },
  { key: "rainy-day", label: "Rainy day", icon: UmbrellaDollarIcon },
  { key: "shopping", label: "Shopping", icon: ShoppingBag01Icon },
  { key: "gadget", label: "Gadget", icon: GameController01Icon },
  { key: "camera", label: "Camera", icon: Camera01Icon },
  { key: "book", label: "Books", icon: Book01Icon },
  { key: "coffee", label: "Treats", icon: Coffee01Icon },
  { key: "detty", label: "Detty december", icon: SunglassesIcon },
  { key: "birthday", label: "Birthday", icon: BirthdayCakeIcon },
  { key: "adventure", label: "Adventure", icon: MountainIcon },
  { key: "dream", label: "Big dream", icon: Rocket01Icon },
  { key: "jewelry", label: "Something nice", icon: Diamond01Icon },
  { key: "love", label: "Someone special", icon: FavouriteCircleIcon },
  { key: "commute", label: "Commute", icon: Bus01Icon },
];

export const DEFAULT_JAR_ICON = "piggy";

export const JAR_COLORS: string[] = [
  "#6d4ae6",
  "#7c5cf0",
  "#8b5cf6",
  "#a855f7",
  "#c026d3",
  "#db2777",
  "#f43f5e",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b7355",
];

export const DEFAULT_JAR_COLOR = "#6d4ae6";

const ICON_BY_KEY = new Map(JAR_ICONS.map((option) => [option.key, option.icon]));

export function jarIconFor(key: string | null | undefined): IconData {
  return ICON_BY_KEY.get(key ?? "") ?? PiggyBankIcon;
}
