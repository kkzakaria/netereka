import type { IconSvgElement } from "@hugeicons/react";
import {
  // battery
  BatteryFullIcon,
  BatteryCharging01Icon,
  // connectivity
  BluetoothIcon,
  WifiConnected01Icon,
  UsbIcon,
  // bolt / zap / flash / charge-fast
  ZapIcon,
  FlashIcon,
  CloudIcon,
  // camera / video / display / tv
  Camera01Icon,
  VideoReplayIcon,
  ComputerIcon,
  Tv01Icon,
  // control & input
  DashboardSquare01Icon,
  FingerPrintIcon,
  EyeIcon,
  Key01Icon,
  LockIcon,
  Shield02Icon,
  Shield01Icon,
  // misc
  CpuIcon,
  GameController01Icon,
  GiftIcon,
  GlobalIcon,
  CompassIcon,
  GpsSignal01Icon,
  HeadphonesIcon,
  FavouriteIcon,
  HourglassIcon,
  Leaf01Icon,
  MedalFirstPlaceIcon,
  Mic01Icon,
  Moon02Icon,
  MusicNote01Icon,
  NotificationCircleIcon,
  PackageIcon,
  PaintBoardIcon,
  PrinterIcon,
  RulerIcon,
  SdCardIcon,
  ShoppingBag01Icon,
  SmartPhone01Icon,
  SparklesIcon,
  SpeakerIcon,
  StarIcon,
  Sun03Icon,
  ToolsIcon,
  TruckDeliveryIcon,
  VolumeHighIcon,
  DropletIcon,
} from "@hugeicons/core-free-icons";
import type { HighlightIconName } from "@/lib/validations/product-story";

/**
 * Map every name in `HIGHLIGHT_ICON_NAMES` (validation) to a Hugeicons component.
 * Must stay in sync with that list. The build/test fails if a name is missing.
 */
export const HIGHLIGHT_ICON_MAP: Record<HighlightIconName, IconSvgElement> = {
  "battery": BatteryFullIcon,
  "battery-charging": BatteryCharging01Icon,
  "bluetooth": BluetoothIcon,
  "bolt": ZapIcon,
  "camera": Camera01Icon,
  "charge-fast": ZapIcon,
  "cloud": CloudIcon,
  "compass": CompassIcon,
  "cpu": CpuIcon,
  "dashboard": DashboardSquare01Icon,
  "display": ComputerIcon,
  "eye": EyeIcon,
  "fingerprint": FingerPrintIcon,
  "flash": FlashIcon,
  "gaming-pad": GameController01Icon,
  "gift": GiftIcon,
  "globe": GlobalIcon,
  "gps": GpsSignal01Icon,
  "headphones": HeadphonesIcon,
  "heart": FavouriteIcon,
  "hourglass": HourglassIcon,
  "key": Key01Icon,
  "leaf": Leaf01Icon,
  "lock": LockIcon,
  "medal": MedalFirstPlaceIcon,
  "microphone": Mic01Icon,
  "moon": Moon02Icon,
  "music-note": MusicNote01Icon,
  "notification": NotificationCircleIcon,
  "package": PackageIcon,
  "palette": PaintBoardIcon,
  "printer": PrinterIcon,
  "ruler": RulerIcon,
  "sd-card": SdCardIcon,
  "shield": Shield02Icon,
  "shield-check": Shield01Icon,
  "shopping-bag": ShoppingBag01Icon,
  "smart-phone": SmartPhone01Icon,
  "sparkle": SparklesIcon,
  "speaker": SpeakerIcon,
  "star": StarIcon,
  "sun": Sun03Icon,
  "tools": ToolsIcon,
  "truck": TruckDeliveryIcon,
  "tv": Tv01Icon,
  "usb": UsbIcon,
  "video": VideoReplayIcon,
  "volume": VolumeHighIcon,
  "water-resistant": DropletIcon,
  "wifi": WifiConnected01Icon,
  "zap": ZapIcon,
};

export function resolveHighlightIcon(name: string): IconSvgElement {
  if (Object.hasOwn(HIGHLIGHT_ICON_MAP, name)) {
    return HIGHLIGHT_ICON_MAP[name as HighlightIconName];
  }
  console.warn(`[product-story] unknown highlight icon "${name}" — falling back to "star"`);
  return HIGHLIGHT_ICON_MAP["star"];
}
