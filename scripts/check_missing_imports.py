#!/usr/bin/env python3
"""Static check for likely missing imports in TSX files."""
import re
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src"
DIRS = ["features", "pages", "components"]

RECHARTS = {
    "AreaChart", "BarChart", "ResponsiveContainer", "CartesianGrid",
    "XAxis", "YAxis", "Tooltip", "Legend", "PieChart", "LineChart", "Cell",
}
ROUTER = {"Link", "useNavigate", "useParams", "Navigate", "Outlet"}
MOTION = {"AnimatePresence"}
MOTION_PATTERNS = [re.compile(r"\bmotion\."), re.compile(r"<\s*motion\.")]

# Common lucide icons used in project - we'll detect any PascalCase JSX tag that looks like lucide
LUCIDE_IMPORT_RE = re.compile(r"from\s+['\"]lucide-react['\"]")

IMPORT_RE = re.compile(
    r"import\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+))\s+from\s+['\"]([^'\"]+)['\"]"
)
NAMED_IMPORT_SPLIT = re.compile(r"\s*,\s*")

# JSX component usage: <Foo or <Foo> or </Foo>
JSX_TAG_RE = re.compile(r"<\s*([A-Z][A-Za-z0-9_]*)")
# Hook/identifier usage
IDENT_USE_RE = re.compile(r"\b(useNavigate|useParams|AnimatePresence)\b")
MOTION_USE_RE = re.compile(r"\b(motion)\b")

# Built-ins and common HTML/React - exclude from missing import checks
BUILTIN = {
    "Fragment", "Suspense", "StrictMode", "Profiler",
    "HTMLDivElement", "HTMLInputElement", "HTMLButtonElement", "HTMLFormElement",
    "HTMLSelectElement", "HTMLTextAreaElement", "HTMLAnchorElement", "HTMLSpanElement",
    "HTMLTableElement", "HTMLTableRowElement", "HTMLTableCellElement", "HTMLHeadingElement",
    "SVGSVGElement", "MouseEvent", "ChangeEvent", "FormEvent", "KeyboardEvent", "FocusEvent",
    "ReactNode", "ReactElement", "FC", "PropsWithChildren", "ComponentType", "RefObject",
    "Dispatch", "SetStateAction", "CSSProperties", "ElementType", "Key", "React",
    "Record", "Partial", "Pick", "Omit", "Required", "Readonly", "Exclude", "Extract",
    "NonNullable", "ReturnType", "Parameters", "Awaited", "Promise", "Array", "Map", "Set",
    "Date", "Error", "Object", "String", "Number", "Boolean", "Symbol", "Function",
    "Intl", "JSON", "Math", "RegExp", "Uint8Array", "Blob", "File", "FormData",
    "AbortController", "RequestInit", "Response", "Request", "Headers",
    "VoidFunction", "NodeJS", "JSX", "IntrinsicElements",
}

# Local type/component patterns from same file exports
PROP_TYPES = {"Props", "ComponentProps"}

def parse_imports(content: str):
    imported = set()
    for m in IMPORT_RE.finditer(content):
        named, default, _src = m.groups()
        if default:
            imported.add(default)
        if named:
            for part in NAMED_IMPORT_SPLIT.split(named):
                part = part.strip()
                if not part:
                    continue
                # handle `Foo as Bar`
                if " as " in part:
                    part = part.split(" as ")[-1].strip()
                # handle type Foo
                part = re.sub(r"^type\s+", "", part).strip()
                if part:
                    imported.add(part)
    return imported

def get_scope_declarations(content: str):
    decl = set()
    # function Foo, const Foo =, interface Foo, type Foo, enum Foo, class Foo
    for m in re.finditer(r"(?:export\s+)?(?:function|class|interface|type|enum)\s+(\w+)", content):
        decl.add(m.group(1))
    for m in re.finditer(r"(?:export\s+)?const\s+(\w+)\s*=", content):
        decl.add(m.group(1))
    # destructured props in function params
    for m in re.finditer(r"function\s+\w+\s*\(\s*\{([^}]+)\}", content):
        for p in NAMED_IMPORT_SPLIT.split(m.group(1)):
            p = p.strip().split(":")[0].strip().split("=")[0].strip()
            if p and re.match(r"^\w+$", p):
                decl.add(p)
    for m in re.finditer(r"\(\s*\{([^}]+)\}\s*(?::|\))", content):
        for p in NAMED_IMPORT_SPLIT.split(m.group(1)):
            p = p.strip().split(":")[0].strip().split("=")[0].strip()
            if p and re.match(r"^\w+$", p):
                decl.add(p)
    return decl

def find_jsx_components(content: str):
    tags = set()
    for m in JSX_TAG_RE.finditer(content):
        tags.add(m.group(1))
    return tags

def check_file(path: Path):
    content = path.read_text(encoding="utf-8", errors="replace")
    issues = []

    # Truncated file check
    if content.rstrip() and not content.rstrip().endswith((";", "}", ">", ")", "`", "*/", "//")):
        last_lines = content.strip().splitlines()[-3:]
        if any("<" in ln and not re.search(r"/>|</|\?>|\{/\*", ln) for ln in last_lines):
            issues.append({"symbol": "(truncated JSX)", "kind": "truncated", "fix": "close JSX"})

    # Unclosed JSX heuristic: count open/close tags imbalance on last 50 lines
    tail = "\n".join(content.splitlines()[-50:])
    open_tags = len(re.findall(r"<\s*[A-Za-z]", tail))
    close_tags = len(re.findall(r"</", tail)) + len(re.findall(r"/>", tail))
    if open_tags > close_tags + 2 and content.count("<") > content.count(">") + 3:
        if not any(i["kind"] == "truncated" for i in issues):
            issues.append({"symbol": "(unbalanced JSX)", "kind": "truncated", "fix": "close JSX"})

    imported = parse_imports(content)
    declared = get_scope_declarations(content)
    in_scope = imported | declared | BUILTIN

    # Recharts
    for sym in RECHARTS:
        if re.search(rf"<\s*{sym}\b", content) and sym not in in_scope:
            issues.append({"symbol": sym, "kind": "recharts", "fix": f"import {{ {sym} }} from 'recharts'"})

    # Router
    for sym in ROUTER:
        if sym == "Link":
            if re.search(r"<\s*Link\b", content) and sym not in in_scope:
                issues.append({"symbol": sym, "kind": "router", "fix": "import { Link } from 'react-router-dom'"})
        elif re.search(rf"\b{sym}\b", content) and sym not in in_scope:
            issues.append({"symbol": sym, "kind": "router", "fix": f"import {{ {sym} }} from 'react-router-dom'"})

    # Motion
    if "motion" not in in_scope:
        if MOTION_USE_RE.search(content) or any(p.search(content) for p in MOTION_PATTERNS):
            issues.append({"symbol": "motion", "kind": "motion", "fix": "import { motion } from 'motion/react'"})
    for sym in MOTION:
        if re.search(rf"\b{sym}\b", content) and sym not in in_scope:
            issues.append({"symbol": sym, "kind": "motion", "fix": "import { AnimatePresence } from 'motion/react'"})

    # Lucide: any PascalCase JSX tag not in scope, excluding known patterns
    jsx_tags = find_jsx_components(content)
    lucide_imported = imported if LUCIDE_IMPORT_RE.search(content) else set()
    # If file imports from lucide-react, only flag tags that look like icons (single word PascalCase, no subcomponents)
    for tag in jsx_tags:
        if tag in in_scope or tag in RECHARTS or tag in ROUTER:
            continue
        if tag.endswith("Props") or tag in PROP_TYPES:
            continue
        # Skip likely local components that are imported from relative paths - already in imported
        if tag in imported:
            continue
        # Heuristic for lucide: typically single CamelCase word, no digits, common icon names
        if re.match(r"^[A-Z][a-zA-Z0-9]*$", tag) and len(tag) >= 3:
            # Check if used as component <Tag 
            if re.search(rf"<\s*{tag}\b", content):
                # Exclude React/HTML-like and common UI lib components
                skip = {
                    "Layout", "Routes", "Route", "BrowserRouter", "HashRouter", "MemoryRouter",
                    "QueryClientProvider", "Toaster", "Toast", "Provider", "ErrorBoundary",
                    "RichTextEditor", "PageSkeleton", "ProtectedRoute", "GlobalSearch",
                    "AvatarGroup", "GradeSheetTemplates", "ReportCardTemplates",
                    "CreateClassroomModal", "JoinClassroomModal",
                }
                if tag in skip:
                    continue
                # Only flag if looks like lucide icon (often ends with common suffixes or short names)
                icon_like = (
                    tag.endswith(("Icon", "2", "Off", "Plus", "Minus", "Check", "X", "Arrow"))
                    or tag in {
                        "Search", "Plus", "Minus", "Check", "X", "ChevronDown", "ChevronUp",
                        "ChevronLeft", "ChevronRight", "ChevronUpDown", "Calendar", "Clock",
                        "User", "Users", "Settings", "Edit", "Trash", "Trash2", "Save", "Download",
                        "Upload", "Eye", "EyeOff", "Lock", "Unlock", "Mail", "Phone", "MapPin",
                        "Home", "Building", "Building2", "School", "Book", "BookOpen", "File",
                        "FileText", "Folder", "Image", "Camera", "Video", "Mic", "Bell", "Star",
                        "Heart", "AlertCircle", "AlertTriangle", "Info", "HelpCircle", "Loader2",
                        "RefreshCw", "RotateCcw", "Filter", "SortAsc", "SortDesc", "MoreHorizontal",
                        "MoreVertical", "Menu", "Grid", "List", "LayoutGrid", "LayoutList",
                        "DollarSign", "CreditCard", "Wallet", "Receipt", "Package", "Truck",
                        "Wrench", "Hammer", "Shield", "ShieldCheck", "Key", "LogIn", "LogOut",
                        "UserPlus", "UserMinus", "UserCheck", "UserX", "GraduationCap",
                        "Clipboard", "ClipboardList", "ClipboardCheck", "BarChart3", "PieChart",
                        "TrendingUp", "TrendingDown", "Activity", "Zap", "Sparkles", "Award",
                        "Target", "Flag", "Tag", "Tags", "Link", "ExternalLink", "Copy",
                        "Printer", "Send", "MessageSquare", "MessagesSquare", "Inbox",
                        "Archive", "History", "Timer", "Hourglass", "Sun", "Moon", "Cloud",
                        "Umbrella", "Car", "Bus", "Plane", "Train", "Bike", "Footprints",
                        "Stethoscope", "Pill", "Syringe", "Thermometer", "Bandage",
                        "Briefcase", "Calculator", "ChartBar", "ChartLine", "ChartPie",
                        "Circle", "Square", "Triangle", "Hexagon", "Octagon", "Diamond",
                        "CircleCheck", "CircleX", "CircleAlert", "CheckCircle", "CheckCircle2",
                        "XCircle", "PlusCircle", "MinusCircle", "ArrowLeft", "ArrowRight",
                        "ArrowUp", "ArrowDown", "ArrowUpRight", "ArrowDownLeft",
                        "ChevronsUpDown", "PanelLeft", "PanelRight", "Maximize2", "Minimize2",
                        "Expand", "Shrink", "GripVertical", "GripHorizontal", "Layers",
                        "LayoutDashboard", "LayoutTemplate", "Table", "Table2", "Columns",
                        "Rows", "Split", "Merge", "GitBranch", "GitCommit", "GitPullRequest",
                        "Paperclip", "Pin", "PinOff", "Bookmark", "BookmarkPlus",
                        "Share", "Share2", "Globe", "Globe2", "Map", "Navigation",
                        "Compass", "Crosshair", "Scan", "QrCode", "Barcode", "Hash",
                        "AtSign", "Percent", "Equal", "NotEqual", "Slash", "Asterisk",
                        "Bot", "Brain", "Cpu", "Database", "Server", "HardDrive", "Wifi",
                        "WifiOff", "Bluetooth", "Radio", "Signal", "Battery", "BatteryLow",
                        "Power", "PowerOff", "Plug", "Unplug", "Lightbulb", "Lamp",
                        "Flame", "Droplet", "Droplets", "Wind", "Snowflake", "Leaf",
                        "TreePine", "Flower", "Bug", "Fish", "Bird", "Cat", "Dog",
                        "Smile", "Frown", "Meh", "Laugh", "Angry", "Annoyed",
                        "ThumbsUp", "ThumbsDown", "Hand", "Handshake", "Fingerprint",
                        "ScanFace", "ScanLine", "Volume", "Volume1", "Volume2", "VolumeX",
                        "Play", "Pause", "StopCircle", "SkipBack", "SkipForward", "Rewind",
                        "FastForward", "Repeat", "Shuffle", "Music", "Headphones",
                        "Monitor", "Smartphone", "Tablet", "Laptop", "Watch", "Tv",
                        "Gamepad", "Gamepad2", "Joystick", "Dice1", "Dice5", "Puzzle",
                        "Gift", "PartyPopper", "Cake", "Coffee", "Utensils", "UtensilsCrossed",
                        "ChefHat", "Wine", "Beer", "Milk", "Apple", "Banana", "Cherry",
                        "Grape", "Citrus", "Salad", "Soup", "Pizza", "Sandwich", "Cookie",
                        "Candy", "IceCream", "Popcorn", "Store", "ShoppingCart", "ShoppingBag",
                        "BadgeCheck", "BadgeAlert", "BadgeDollarSign", "BadgePercent",
                        "Scale", "Ruler", "Pen", "PenLine", "Pencil", "Eraser", "Highlighter",
                        "Paintbrush", "Palette", "Scissors", "Ruler", "DraftingCompass",
                        "Notebook", "NotebookPen", "StickyNote", "Newspaper", "Library",
                        "LibraryBig", "Backpack", "Presentation", "Projector", "Microscope",
                        "FlaskConical", "TestTube", "Atom", "Dna", "Orbit", "Rocket",
                        "Satellite", "Telescope", "Mountain", "MountainSnow", "Tent",
                        "Campfire", "Anchor", "Ship", "Sailboat", "Anchor", "LifeBuoy",
                        "Siren", "Siren", "Construction", "Cone", "HardHat", "Pickaxe",
                        "Shovel", "Axe", "Sword", "ShieldAlert", "Swords", "Cross",
                        "Church", "Castle", "Landmark", "Factory", "Warehouse", "Hospital",
                        "Hotel", "Bed", "BedDouble", "Bath", "ShowerHead", "Sofa",
                        "Armchair", "DoorOpen", "DoorClosed", "KeyRound", "LockKeyhole",
                        "Vault", "Safe", "Banknote", "Coins", "PiggyBank", "Landmark",
                        "CircleDollarSign", "HandCoins", "HandHeart", "HeartHandshake",
                        "Handshake", "UsersRound", "UserRound", "UserCog", "UserSearch",
                        "Contact", "ContactRound", "IdCard", "Badge", "Ticket", "Tickets",
                        "CalendarDays", "CalendarCheck", "CalendarClock", "CalendarRange",
                        "AlarmClock", "TimerReset", "Watch", "Sunrise", "Sunset",
                        "CloudRain", "CloudSnow", "CloudLightning", "Tornado", "Rainbow",
                        "ThermometerSun", "ThermometerSnowflake", "Umbrella", "UmbrellaOff",
                        "ClipboardPen", "ClipboardCopy", "ClipboardPaste", "ClipboardX",
                        "FilePlus", "FileMinus", "FileCheck", "FileX", "FileSearch",
                        "FileEdit", "FileCode", "FileJson", "FileSpreadsheet", "FileImage",
                        "FolderOpen", "FolderPlus", "FolderMinus", "FolderSearch", "FolderTree",
                        "ImagePlus", "ImageMinus", "ImageOff", "Images", "GalleryHorizontal",
                        "GalleryVertical", "Aperture", "Focus", "ScanEye", "ScanSearch",
                        "ZoomIn", "ZoomOut", "Move", "MoveHorizontal", "MoveVertical",
                        "Maximize", "Minimize", "Fullscreen", "PictureInPicture",
                        "PanelTop", "PanelBottom", "Sidebar", "SidebarOpen", "SidebarClose",
                        "AlignLeft", "AlignCenter", "AlignRight", "AlignJustify",
                        "Bold", "Italic", "Underline", "Strikethrough", "Subscript", "Superscript",
                        "ListOrdered", "ListChecks", "ListTodo", "ListTree", "ListCollapse",
                        "Quote", "Text", "TextCursor", "Type", "Heading", "Heading1",
                        "Code", "Code2", "Terminal", "Brackets", "Braces", "Parentheses",
                        "Binary", "Regex", "Variable", "FunctionSquare", "Sigma",
                        "Infinity", "Pi", "Radical", "Divide", "Plus", "Minus", "X",
                        "CircleDot", "Dot", "Ellipsis", "EllipsisVertical",
                        "Grip", "MousePointer", "MousePointer2", "Pointer", "HandMetal",
                        "Touchpad", "Keyboard", "Command", "Option", "Space", "Delete",
                        "Backspace", "Enter", "Escape", "Tab", "CapsLock", "Shift",
                        "ToggleLeft", "ToggleRight", "SwitchCamera", "SwitchCamera",
                        "SlidersHorizontal", "SlidersVertical", "Settings2", "Cog",
                        "Wrench", "Hammer", "Screwdriver", "Nut", "Bolt",
                        "CircleHelp", "CircleQuestionMark", "BadgeHelp", "BadgeInfo",
                        "Megaphone", "Radio", "Podcast", "Rss", "Webhook", "CloudCog",
                        "CloudUpload", "CloudDownload", "CloudOff", "CloudCheck",
                        "UploadCloud", "DownloadCloud", "Import", "Export",
                        "LogIn", "LogOut", "DoorOpen", "DoorClosed", "Fingerprint",
                        "ScanBarcode", "ScanQrCode", "QrCode", "Barcode",
                        "BellRing", "BellOff", "BellPlus", "BellMinus", "BellDot",
                        "MessageCircle", "MessageCirclePlus", "MessageCircleX",
                        "MailOpen", "MailCheck", "MailX", "MailPlus", "MailMinus",
                        "Inbox", "Archive", "ArchiveRestore", "ArchiveX",
                        "Trash", "Trash2", "Recycle", "Shredder",
                        "Undo", "Undo2", "Redo", "Redo2", "Reply", "ReplyAll", "Forward",
                        "CornerUpLeft", "CornerUpRight", "CornerDownLeft", "CornerDownRight",
                        "MoveUp", "MoveDown", "MoveLeft", "MoveRight", "ArrowBigUp",
                        "ArrowBigDown", "ArrowBigLeft", "ArrowBigRight",
                        "ChevronsLeft", "ChevronsRight", "ChevronsUp", "ChevronsDown",
                        "PanelLeftClose", "PanelLeftOpen", "PanelRightClose", "PanelRightOpen",
                        "SquarePen", "SquarePlus", "SquareMinus", "SquareX", "SquareCheck",
                        "CirclePlus", "CircleMinus", "CircleSlash", "CircleOff",
                        "OctagonAlert", "OctagonX", "OctagonPause", "TriangleAlert",
                        "ShieldQuestion", "ShieldX", "ShieldOff", "ShieldBan",
                        "LockOpen", "UnlockKeyhole", "KeySquare", "KeyRound",
                        "Eye", "EyeClosed", "Glasses", "ScanEye", "View",
                        "Accessibility", "Baby", "PersonStanding", "Footprints",
                        "Dumbbell", "Medal", "Trophy", "Crown", "Gem", "Diamond",
                        "Sparkle", "Stars", "Wand", "Wand2", "Magic", "Ghost",
                        "Skull", "Bone", "Biohazard", "Radiation", "Virus",
                        "Pill", "Tablets", "Stethoscope", "HeartPulse", "Activity",
                        "Syringe", "Bandage", "Cross", "Ambulance", "Hospital",
                        "Wheelchair", "Crutch", "BedSingle", "BedDouble",
                        "BusFront", "CarFront", "CarTaxiFront", "Truck", "Tractor",
                        "Forklift", "Container", "Package2", "PackageOpen", "PackageCheck",
                        "PackageX", "PackagePlus", "PackageMinus", "PackageSearch",
                        "Boxes", "Box", "Crate", "Palette", "PaintBucket", "Brush",
                        "SprayCan", "Droplets", "SoapDispenserDroplet", "Broom",
                        "Shirt", "Shoe", "Watch", "Glasses", "HatGlasses",
                        "Wallet", "WalletCards", "WalletMinimal", "CreditCard",
                        "Banknote", "CircleDollarSign", "BadgeDollarSign", "Receipt",
                        "ReceiptText", "ReceiptCent", "PiggyBank", "HandCoins",
                        "Landmark", "Building", "Building2", "Factory", "Warehouse",
                        "Store", "Storefront", "ShoppingBasket", "ShoppingBag",
                        "Scale", "Weight", "Ruler", "Ruler", "TapeMeasure",
                        "Thermometer", "Gauge", "GaugeCircle", "Speedometer",
                        "BarChart", "BarChart2", "BarChart3", "BarChart4", "BarChartHorizontal",
                        "LineChart", "PieChart", "ChartArea", "ChartBar", "ChartColumn",
                        "ChartLine", "ChartPie", "ChartSpline", "ChartNoAxesCombined",
                        "TrendingUp", "TrendingDown", "TrendingUpDown",
                        "Presentation", "Projector", "Easel", "Chalkboard",
                        "GraduationCap", "School", "School2", "BookMarked", "BookOpenCheck",
                        "BookCopy", "BookPlus", "BookMinus", "BookX", "BookCheck",
                        "NotebookTabs", "NotebookText", "ScrollText", "Scroll",
                        "Library", "LibraryBig", "Microscope", "FlaskConical",
                        "TestTube", "TestTubeDiagonal", "Atom", "Orbit", "Rocket",
                        "Satellite", "Telescope", "Brain", "Cpu", "CircuitBoard",
                        "Binary", "Code", "CodeXml", "Brackets", "Braces",
                        "Terminal", "Command", "Keyboard", "Mouse", "Monitor",
                        "MonitorSmartphone", "MonitorSpeaker", "Laptop", "LaptopMinimal",
                        "Tablet", "TabletSmartphone", "Smartphone", "SmartphoneCharging",
                        "Watch", "Tv", "TvMinimal", "Radio", "Speaker", "Volume2",
                        "Headphones", "Headset", "Mic", "MicOff", "Video", "VideoOff",
                        "Webcam", "Camera", "CameraOff", "Aperture", "Focus",
                        "Image", "Images", "GalleryHorizontal", "GalleryVertical",
                        "Film", "Clapperboard", "Music", "Music2", "Music3", "Music4",
                        "Play", "Pause", "SquarePlay", "CirclePlay", "StopCircle",
                        "SkipBack", "SkipForward", "Rewind", "FastForward", "Repeat",
                        "Repeat1", "Shuffle", "ListMusic", "Disc", "Disc2", "Disc3",
                        "Album", "Radio", "Podcast", "Rss", "Antenna", "SatelliteDish",
                        "Wifi", "WifiOff", "WifiHigh", "WifiLow", "WifiZero",
                        "Bluetooth", "BluetoothConnected", "BluetoothOff", "BluetoothSearching",
                        "Nfc", "Usb", "Cable", "Plug", "PlugZap", "Unplug", "Battery",
                        "BatteryFull", "BatteryMedium", "BatteryLow", "BatteryWarning",
                        "BatteryCharging", "Power", "PowerOff", "Zap", "ZapOff",
                        "Lightbulb", "LightbulbOff", "Lamp", "LampDesk", "LampFloor",
                        "Sun", "SunDim", "SunMedium", "SunMoon", "Moon", "MoonStar",
                        "Cloud", "CloudSun", "CloudMoon", "CloudRain", "CloudSnow",
                        "CloudLightning", "CloudFog", "CloudDrizzle", "CloudHail",
                        "Wind", "Tornado", "Rainbow", "Snowflake", "Thermometer",
                        "ThermometerSun", "ThermometerSnowflake", "Droplet", "Droplets",
                        "Waves", "Flame", "FireExtinguisher", "Heater", "AirVent",
                        "Fan", "Refrigerator", "WashingMachine", "Microwave",
                        "CookingPot", "Utensils", "UtensilsCrossed", "ChefHat",
                        "Coffee", "Wine", "Beer", "Milk", "GlassWater", "CupSoda",
                        "Pizza", "Sandwich", "Salad", "Soup", "Cookie", "Candy",
                        "IceCream", "IceCreamBowl", "IceCreamCone", "Cake", "CakeSlice",
                        "Cherry", "Apple", "Banana", "Grape", "Citrus", "Carrot",
                        "Leaf", "TreePine", "TreeDeciduous", "Flower", "Flower2",
                        "Sprout", "Palmtree", "Cactus", "Mountain", "MountainSnow",
                        "Tent", "Campfire", "Compass", "Map", "MapPin", "MapPinned",
                        "Navigation", "Navigation2", "Globe", "Globe2", "Earth",
                        "Plane", "PlaneTakeoff", "PlaneLanding", "Ship", "Sailboat",
                        "Anchor", "LifeBuoy", "Car", "CarFront", "Bus", "BusFront",
                        "TrainFront", "TrainTrack", "TramFront", "Bike", "Footprints",
                        "Route", "Signpost", "Milestone", "TrafficCone", "Construction",
                        "HardHat", "Shovel", "Pickaxe", "Hammer", "Axe", "Wrench",
                        "Screwdriver", "Drill", "PaintRoller", "Brush", "SprayCan",
                        "Ruler", "Triangle", "Square", "Circle", "Hexagon", "Octagon",
                        "Diamond", "Pentagon", "Star", "Heart", "Spade", "Club",
                        "Smile", "Frown", "Meh", "Laugh", "Angry", "Annoyed",
                        "ThumbsUp", "ThumbsDown", "Hand", "Handshake", "HeartHandshake",
                        "Gift", "PartyPopper", "Sparkles", "Sparkle", "Stars", "Wand",
                        "Wand2", "Ghost", "Skull", "Bone", "Biohazard", "Radiation",
                        "Loader", "Loader2", "LoaderCircle", "LoaderPinwheel",
                        "RefreshCw", "RefreshCcw", "RotateCw", "RotateCcw", "Repeat",
                        "Undo", "Redo", "History", "Timer", "TimerOff", "TimerReset",
                        "Hourglass", "AlarmClock", "AlarmClockOff", "AlarmClockCheck",
                        "Clock", "Clock1", "Clock2", "Clock3", "Clock4", "Clock5",
                        "Clock6", "Clock7", "Clock8", "Clock9", "Clock10", "Clock11", "Clock12",
                        "Calendar", "CalendarDays", "CalendarCheck", "CalendarClock",
                        "CalendarRange", "CalendarSearch", "CalendarPlus", "CalendarMinus",
                        "CalendarX", "CalendarHeart", "CalendarFold",
                    }
                )
                if icon_like and tag not in in_scope:
                    # Could be local component - check if defined in same directory feature
                    issues.append({"symbol": tag, "kind": "lucide_or_component", "fix": f"import {{ {tag} }} (check lucide-react or local component)"})

    # Wrong import path: inside components/ using ./components/
    rel = str(path.relative_to(ROOT.parent))
    if "/components/" in rel.replace("\\", "/") and 'from "./components/' in content:
        issues.append({"symbol": "./components/*", "kind": "wrong_import", "fix": "use relative path without extra components/"})

    # Out-of-scope prop passing pattern
    for m in re.finditer(r"(\w+)=\{(\w+)\}", content):
        prop, val = m.groups()
        if prop in {"subject", "teacherMember", "T", "S", "Card"} and val == prop:
            if val not in declared and val not in imported:
                issues.append({"symbol": val, "kind": "out_of_scope_prop", "fix": f"remove or declare {val}"})

    return issues

def main():
    results = {}
    all_files = []
    for d in DIRS:
        base = ROOT / d
        if not base.exists():
            continue
        for p in sorted(base.rglob("*.tsx")):
            all_files.append(p)
        for p in sorted(base.rglob("*.ts")):
            if p.name.endswith(".tsx"):
                continue
            # skip pure ts in features mostly api/types
            all_files.append(p)

    for path in all_files:
        if path.suffix not in (".tsx", ".ts"):
            continue
        rel = str(path.relative_to(ROOT.parent))
        try:
            issues = check_file(path)
        except Exception as e:
            issues = [{"symbol": str(e), "kind": "error", "fix": "manual review"}]
        results[rel] = issues

    broken = {k: v for k, v in results.items() if v}
    clean = [k for k, v in results.items() if not v]
    print(json.dumps({"broken": broken, "clean_count": len(clean), "broken_count": len(broken), "total": len(results)}, indent=2))

if __name__ == "__main__":
    main()
