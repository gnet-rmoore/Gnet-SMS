/** Localized `public.errorPages` packs (merged into publicLocale exports). */

const sharedShape = {
  goHome: "",
  goBack: "",
  signIn: "",
  tryAgain: "",
  footerNote: "",
  notFound: { eyebrow: "", title: "", body: "", hint: "" },
  forbidden: {
    eyebrow: "",
    hintLock: "",
    hintAsk: "",
    role: { title: "", body: "" },
    capability: { title: "", body: "" },
    generic: { title: "", body: "" },
  },
  serverError: {
    eyebrow: "",
    hint: "",
    hintReload: "",
    generic: { title: "", body: "" },
    chunk: { title: "", body: "" },
  },
  offline: { eyebrow: "", title: "", body: "", hint: "", hintRetry: "" },
};

export type ErrorPagesLocale = typeof sharedShape;

export const frErrorPages: ErrorPagesLocale = {
  goHome: "Accueil",
  goBack: "Retour",
  signIn: "Se connecter",
  tryAgain: "Réessayer",
  footerNote:
    "Si le problème continue, contactez l’admin de l’école ou le support Gnet SMS",
  notFound: {
    eyebrow: "Page introuvable",
    title: "Cette page n’existe pas",
    body: "Le lien est peut‑être incorrect, obsolète ou mal saisi.",
    hint: "Vérifiez l’URL, ou utilisez le menu / l’accueil pour trouver ce qu’il vous faut.",
  },
  forbidden: {
    eyebrow: "Accès refusé",
    hintLock:
      "Vous êtes connecté, mais cette zone n’est pas incluse dans votre rôle ou vos permissions.",
    hintAsk: "Demandez à un admin scolaire si vous pensez devoir y accéder.",
    role: {
      title: "Vous n’avez pas accès à cette zone",
      body: "Votre rôle n’est pas autorisé à ouvrir cette page.",
    },
    capability: {
      title: "Cette fonctionnalité n’est pas activée pour vous",
      body: "Un admin scolaire peut ajuster Rôles & accès si vous en avez besoin.",
    },
    generic: {
      title: "Permission insuffisante",
      body: "Cette page est restreinte pour votre compte.",
    },
  },
  serverError: {
    eyebrow: "Une erreur est survenue",
    hint: "Erreur temporaire de l’application — pas un problème de mot de passe.",
    hintReload:
      "Réessayez. Après un déploiement, un rechargement complet suffit souvent.",
    generic: {
      title: "Erreur inattendue",
      body: "L’application a rencontré un problème en chargeant cet écran. Vos données n’ont pas été volontairement modifiées.",
    },
    chunk: {
      title: "Mise à jour requise",
      body: "Une nouvelle version de l’application est disponible. Rechargez pour continuer.",
    },
  },
  offline: {
    eyebrow: "Pas de connexion",
    title: "Vous êtes hors ligne",
    body: "Gnet SMS a besoin d’Internet pour charger les données scolaires. Vérifiez le Wi‑Fi ou les données mobiles, puis réessayez.",
    hint: "Les pages déjà ouvertes peuvent rester visibles, mais enregistrements et nouveaux chargements échoueront jusqu’au retour en ligne.",
    hintRetry:
      "Quand la connexion revient, cette page se ferme seule — ou appuyez sur Réessayer.",
  },
};

export const arErrorPages: ErrorPagesLocale = {
  goHome: "الرئيسية",
  goBack: "رجوع",
  signIn: "تسجيل الدخول",
  tryAgain: "إعادة المحاولة",
  footerNote: "إذا استمر الأمر، تواصل مع مسؤول المدرسة أو دعم Gnet SMS",
  notFound: {
    eyebrow: "الصفحة غير موجودة",
    title: "تعذر العثور على هذه الصفحة",
    body: "قد يكون الرابط معطوبًا أو قديمًا أو مكتوبًا بشكل خاطئ.",
    hint: "تحقق من الرابط، أو استخدم القائمة / الرئيسية للوصول لما تحتاجه.",
  },
  forbidden: {
    eyebrow: "الوصول مرفوض",
    hintLock: "أنت مسجّل الدخول، لكن هذه المنطقة غير مشمولة في دورك أو صلاحياتك.",
    hintAsk: "اطلب من مسؤول المدرسة إذا كنت ترى أنه يجب أن تملك صلاحية الوصول.",
    role: {
      title: "ليس لديك صلاحية لهذه المنطقة",
      body: "دورك غير مسموح له بفتح هذه الصفحة.",
    },
    capability: {
      title: "هذه الميزة غير مفعّلة لحسابك",
      body: "يمكن لمسؤول المدرسة تعديل الأدوار والصلاحيات إذا احتجت هذه الصفحة.",
    },
    generic: {
      title: "ليس لديك إذن",
      body: "هذه الصفحة مقيدة لحسابك.",
    },
  },
  serverError: {
    eyebrow: "حدث خطأ ما",
    hint: "خطأ مؤقت في التطبيق — وليس مشكلة في كلمة المرور.",
    hintReload: "أعد المحاولة. بعد نشر نسخة جديدة، غالبًا يكفي إعادة تحميل الصفحة.",
    generic: {
      title: "خطأ غير متوقع",
      body: "واجه التطبيق مشكلة أثناء تحميل هذه الشاشة. لم تُغيَّر بياناتك عمدًا.",
    },
    chunk: {
      title: "يلزم التحديث",
      body: "تتوفر نسخة أحدث من التطبيق. أعد التحميل للمتابعة.",
    },
  },
  offline: {
    eyebrow: "لا يوجد اتصال",
    title: "أنت غير متصل",
    body: "يحتاج Gnet SMS إلى الإنترنت لتحميل بيانات المدرسة. تحقق من الواي فاي أو بيانات الجوال ثم أعد المحاولة.",
    hint: "قد تبقى الصفحات المفتوحة ظاهرة، لكن الحفظ والتحميل الجديد سيفشلان حتى تعود الاتصال.",
    hintRetry: "عند عودة الاتصال تُغلق هذه الصفحة تلقائيًا — أو اضغط إعادة المحاولة.",
  },
};

export const esErrorPages: ErrorPagesLocale = {
  goHome: "Inicio",
  goBack: "Volver",
  signIn: "Iniciar sesión",
  tryAgain: "Reintentar",
  footerNote:
    "Si sigue ocurriendo, contacte al admin de la escuela o al soporte de Gnet SMS",
  notFound: {
    eyebrow: "Página no encontrada",
    title: "No encontramos esa página",
    body: "El enlace puede estar roto, desactualizado o mal escrito.",
    hint: "Revise la URL o use el menú / inicio para encontrar lo que necesita.",
  },
  forbidden: {
    eyebrow: "Acceso denegado",
    hintLock:
      "Ha iniciado sesión, pero esta área no está incluida en su rol o permisos.",
    hintAsk: "Pida a un admin escolar si cree que debería tener acceso.",
    role: {
      title: "No tiene acceso a esta área",
      body: "Su rol no puede abrir esta página.",
    },
    capability: {
      title: "Esta función no está habilitada para usted",
      body: "Un admin escolar puede ajustar Roles y acceso si la necesita.",
    },
    generic: {
      title: "Sin permiso",
      body: "Esta página está restringida para su cuenta.",
    },
  },
  serverError: {
    eyebrow: "Algo salió mal",
    hint: "Error temporal de la aplicación — no es un problema de contraseña.",
    hintReload:
      "Inténtelo de nuevo. Tras un despliegue, suele bastar con recargar.",
    generic: {
      title: "Error inesperado",
      body: "La app tuvo un problema al cargar esta pantalla. Sus datos no se modificaron a propósito.",
    },
    chunk: {
      title: "Actualización requerida",
      body: "Hay una versión más reciente de la app. Recargue para continuar.",
    },
  },
  offline: {
    eyebrow: "Sin conexión",
    title: "Está sin conexión",
    body: "Gnet SMS necesita internet para cargar datos escolares. Revise Wi‑Fi o datos móviles e intente de nuevo.",
    hint: "Las páginas ya abiertas pueden seguir visibles, pero guardar y nuevas cargas fallarán hasta volver en línea.",
    hintRetry:
      "Cuando vuelva la conexión, esta página se cierra sola — o pulse Reintentar.",
  },
};

export const deErrorPages: ErrorPagesLocale = {
  goHome: "Startseite",
  goBack: "Zurück",
  signIn: "Anmelden",
  tryAgain: "Erneut versuchen",
  footerNote:
    "Wenn das weiterhin passiert, wenden Sie sich an den Schul-Admin oder den Gnet-SMS-Support",
  notFound: {
    eyebrow: "Seite nicht gefunden",
    title: "Diese Seite gibt es nicht",
    body: "Der Link ist möglicherweise kaputt, veraltet oder falsch eingegeben.",
    hint: "Prüfen Sie die URL oder nutzen Sie Menü / Startseite.",
  },
  forbidden: {
    eyebrow: "Zugriff verweigert",
    hintLock:
      "Sie sind angemeldet, aber dieser Bereich gehört nicht zu Ihrer Rolle oder Berechtigung.",
    hintAsk: "Fragen Sie einen Schul-Admin, wenn Sie Zugriff erwarten.",
    role: {
      title: "Kein Zugriff auf diesen Bereich",
      body: "Ihre Rolle darf diese Seite nicht öffnen.",
    },
    capability: {
      title: "Diese Funktion ist für Sie nicht freigeschaltet",
      body: "Ein Schul-Admin kann Rollen & Zugriff anpassen, wenn Sie die Seite brauchen.",
    },
    generic: {
      title: "Keine Berechtigung",
      body: "Diese Seite ist für Ihr Konto eingeschränkt.",
    },
  },
  serverError: {
    eyebrow: "Etwas ist schiefgelaufen",
    hint: "Vorübergehender Anwendungsfehler — kein Passwortproblem.",
    hintReload:
      "Erneut versuchen. Nach einem Deploy hilft oft ein vollständiger Reload.",
    generic: {
      title: "Unerwarteter Fehler",
      body: "Die App hatte beim Laden dieses Bildschirms ein Problem. Ihre Daten wurden nicht absichtlich geändert.",
    },
    chunk: {
      title: "Update erforderlich",
      body: "Eine neuere Version der App ist verfügbar. Neu laden, um fortzufahren.",
    },
  },
  offline: {
    eyebrow: "Keine Verbindung",
    title: "Sie sind offline",
    body: "Gnet SMS braucht Internet, um Schuldaten zu laden. Prüfen Sie WLAN oder Mobilfunk und versuchen Sie es erneut.",
    hint: "Bereits geöffnete Seiten können sichtbar bleiben, Speichern und neue Loads scheitern bis Sie wieder online sind.",
    hintRetry:
      "Wenn die Verbindung zurückkehrt, schließt sich diese Seite automatisch — oder tippen Sie auf Erneut versuchen.",
  },
};

export const zhHansErrorPages: ErrorPagesLocale = {
  goHome: "返回首页",
  goBack: "返回",
  signIn: "登录",
  tryAgain: "重试",
  footerNote: "若持续出现，请联系学校管理员或 Gnet SMS 支持",
  notFound: {
    eyebrow: "页面未找到",
    title: "找不到该页面",
    body: "链接可能已失效、过期或输入有误。",
    hint: "请检查网址，或通过侧边栏/首页查找所需内容。",
  },
  forbidden: {
    eyebrow: "拒绝访问",
    hintLock: "您已登录，但此区域未包含在您的角色或权限中。",
    hintAsk: "若您认为应有权限，请联系学校管理员。",
    role: {
      title: "您无权访问此区域",
      body: "您的角色不允许打开此页面。",
    },
    capability: {
      title: "此功能未对您启用",
      body: "如需此页面，学校管理员可在「角色与权限」中调整。",
    },
    generic: {
      title: "没有权限",
      body: "此页面对您的账户受限。",
    },
  },
  serverError: {
    eyebrow: "出了点问题",
    hint: "这是临时应用错误，与密码无关。",
    hintReload: "请重试。若刚部署新版本，完整刷新通常可解决。",
    generic: {
      title: "意外错误",
      body: "加载此屏幕时出错。您的数据未被故意更改。",
    },
    chunk: {
      title: "需要更新",
      body: "有新版本可用。请刷新后继续。",
    },
  },
  offline: {
    eyebrow: "无网络连接",
    title: "您已离线",
    body: "Gnet SMS 需要网络才能加载学校数据。请检查 Wi‑Fi 或移动数据后重试。",
    hint: "已打开的页面可能仍可见，但保存与新加载在恢复联网前会失败。",
    hintRetry: "网络恢复后此页会自动关闭 — 也可点击重试。",
  },
};

export const hiErrorPages: ErrorPagesLocale = {
  goHome: "होम",
  goBack: "वापस",
  signIn: "साइन इन",
  tryAgain: "फिर कोशिश करें",
  footerNote: "यदि समस्या बनी रहे, स्कूल एडमिन या Gnet SMS सपोर्ट से संपर्क करें",
  notFound: {
    eyebrow: "पेज नहीं मिला",
    title: "यह पेज नहीं मिला",
    body: "लिंक टूटा, पुराना या गलत टाइप किया हो सकता है।",
    hint: "URL जाँचें, या साइडबार / होम से आवश्यक पृष्ठ खोलें।",
  },
  forbidden: {
    eyebrow: "पहुँच अस्वीकृत",
    hintLock: "आप साइन इन हैं, पर यह क्षेत्र आपकी भूमिका या अनुमति में नहीं है।",
    hintAsk: "यदि आपको पहुँच मिलनी चाहिए, स्कूल एडमिन से पूछें।",
    role: {
      title: "आपको इस क्षेत्र की अनुमति नहीं है",
      body: "आपकी भूमिका इस पेज को खोलने की अनुमति नहीं देती।",
    },
    capability: {
      title: "यह सुविधा आपके लिए सक्षम नहीं है",
      body: "यदि ज़रूरत हो तो स्कूल एडमिन Roles & Access में समायोजित कर सकते हैं।",
    },
    generic: {
      title: "अनुमति नहीं है",
      body: "यह पेज आपके खाते के लिए प्रतिबंधित है।",
    },
  },
  serverError: {
    eyebrow: "कुछ गलत हो गया",
    hint: "यह अस्थायी ऐप त्रुटि है — पासवर्ड समस्या नहीं।",
    hintReload: "फिर कोशिश करें। नए डिप्लॉय के बाद पूरा रीलोड अक्सर ठीक करता है।",
    generic: {
      title: "अप्रत्याशित त्रुटि",
      body: "यह स्क्रीन लोड करते समय ऐप में समस्या आई। आपका डेटा जानबूझकर नहीं बदला गया।",
    },
    chunk: {
      title: "अपडेट आवश्यक",
      body: "ऐप का नया संस्करण उपलब्ध है। जारी रखने के लिए रीलोड करें।",
    },
  },
  offline: {
    eyebrow: "कोई कनेक्शन नहीं",
    title: "आप ऑफ़लाइन हैं",
    body: "स्कूल डेटा लोड करने के लिए Gnet SMS को इंटरनेट चाहिए। Wi‑Fi या मोबाइल डेटा जाँचकर फिर कोशिश करें।",
    hint: "पहले खोले गए पेज दिख सकते हैं, पर सेव और नए लोड ऑनलाइन होने तक विफल रहेंगे।",
    hintRetry: "कनेक्शन लौटते ही यह पेज अपने आप बंद हो जाता है — या फिर कोशिश करें दबाएँ।",
  },
};
