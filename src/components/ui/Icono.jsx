import {
  ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays, CalendarOff, CalendarRange,
  ChartColumn, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  CircleAlert, CircleCheck, CircleHelp, CircleX, ClipboardList, ClipboardPenLine,
  CloudUpload, Copy, CreditCard, Drama, Ellipsis, Eye, EyeOff, FileCheck2, FileText,
  Funnel, GraduationCap, Headphones, House, Image, Info, LayoutGrid, Lightbulb,
  Link2, LockKeyhole, LogIn, LogOut, MapPin, Menu, Moon, Newspaper, Palmtree,
  Pencil, Plus, QrCode, Search, Send, SquarePen, Star, Sun, Trash2, TriangleAlert,
  Trophy, UserRound, UsersRound, Video, X, Zap, Clock3,
} from 'lucide-react';

// Mantiene los nombres usados por la aplicación con iconos oficiales de Lucide.
const ICONOS = {
  qr: QrCode, check: Check, close: X, 'check-circle': CircleCheck, users: UsersRound,
  search: Search, 'arrow-left': ArrowLeft, bell: Bell, grid: LayoutGrid, sun: Sun,
  moon: Moon, logout: LogOut, trash: Trash2, calendar: CalendarDays, clock: Clock3,
  home: House, clipboard: ClipboardList, duplicate: Copy, profile: UserRound,
  plus: Plus, edit: SquarePen, pencil: Pencil, lock: LockKeyhole, location: MapPin,
  'location-point': MapPin, help: CircleHelp, 'arrow-right': ArrowRight,
  'chevron-left': ChevronLeft, 'chevron-right': ChevronRight, 'video-camera': Video,
  menu: Menu, login: LogIn, file: FileText, 'alert-triangle': TriangleAlert,
  upload: CloudUpload, zap: Zap, headphones: Headphones, lightbulb: Lightbulb,
  'map-pin': MapPin, info: Info, image: Image, 'help-circle': CircleHelp, eye: Eye,
  'eye-off': EyeOff, send: Send, link: Link2, 'chart-bar': ChartColumn,
  'dots-horizontal': Ellipsis, 'chevron-down': ChevronDown, 'chevron-up': ChevronUp,
  'alert-circle': CircleAlert, 'x-circle': CircleX, star: Star, filter: Funnel,
  newspaper: Newspaper, book: BookOpen, 'clipboard-pen': ClipboardPenLine,
  'credit-card': CreditCard, 'palm-tree': Palmtree, 'graduation-cap': GraduationCap,
  'calendar-off': CalendarOff, 'file-check': FileCheck2, 'calendar-range': CalendarRange,
  trophy: Trophy, drama: Drama,
};

export function Icono({ nombre, className = 'h-5 w-5', strokeWidth = 1.75 }) {
  const ComponenteIcono = ICONOS[nombre];
  if (!ComponenteIcono) {
    console.warn(`Icono "${nombre}" no encontrado`);
    return null;
  }
  return <ComponenteIcono aria-hidden="true" focusable="false" className={className} strokeWidth={strokeWidth} />;
}
