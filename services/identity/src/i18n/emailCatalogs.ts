/** Locale-aware transactional email copy for the Identity service. */

export type AppLocale = "en" | "fr" | "ar" | "es" | "de" | "zh-Hans" | "hi";

export type EmailMessageKey =
  | "registrationConfirm"
  | "registrationNeedsInfo"
  | "registrationRejected"
  | "welcomeSchool"
  | "inviteResent"
  | "accountReady"
  | "guideWelcome"
  | "emailVerify"
  | "passwordReset"
  | "applicationReceived"
  | "entranceScheduled";

type EmailMessage = { subject: string; text: string };
type EmailCatalog = Record<EmailMessageKey, EmailMessage>;

const SUPPORTED_LOCALES: AppLocale[] = ["en", "fr", "ar", "es", "de", "zh-Hans", "hi"];

export function normalizeLocale(raw?: string | null): AppLocale | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const v = raw.trim();
  if (SUPPORTED_LOCALES.includes(v as AppLocale)) return v as AppLocale;
  const lower = v.toLowerCase();
  if (lower === "zh" || lower.startsWith("zh-cn") || lower.startsWith("zh-hans")) return "zh-Hans";
  const primary = lower.split("-")[0];
  if (SUPPORTED_LOCALES.includes(primary as AppLocale)) return primary as AppLocale;
  if (primary === "zh") return "zh-Hans";
  return null;
}

export function resolveEmailLocale(
  preferred?: string | null,
  schoolDefault?: string | null
): AppLocale {
  return normalizeLocale(preferred) || normalizeLocale(schoolDefault) || "en";
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template
    .replace(
      /\{\{#if (\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_, key: string, whenSet: string, whenMissing: string) =>
        interpolate(vars[key] ? whenSet : whenMissing, vars)
    )
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

const EMAIL_CATALOGS: Record<AppLocale, EmailCatalog> = {
  en: {
    registrationConfirm: {
      subject: "Confirm your school registration",
      text: "Thanks for applying on behalf of {{organizationName}}.\n\nConfirm your email address to complete your application:\n{{confirmUrl}}\n\nYour application is only reviewed after you confirm your email. Once clicked, no further action is needed.",
    },
    registrationNeedsInfo: {
      subject: "Additional information needed — YourSMS",
      text: "Regarding {{organizationName}}:\n\n{{notes}}",
    },
    registrationRejected: {
      subject: "School registration update — YourSMS",
      text: "Your application for {{organizationName}} was not approved.\n\n{{notes}}",
    },
    welcomeSchool: {
      subject: "Welcome to YourSMS — {{schoolName}}",
      text: [
        "Your school \"{{schoolName}}\" is ready.",
        "",
        "Login email: {{email}}",
        "Temporary password: {{tempPassword}}",
        "",
        "Or set your password: {{inviteUrl}}",
        "",
        "School URL path: /{{slug}}",
        "",
        "This invite expires in 7 days.",
      ].join("\n"),
    },
    inviteResent: {
      subject: "YourSMS invite resent — {{schoolName}}",
      text: "Login: {{email}}\nTemporary password: {{tempPassword}}\nSet password: {{inviteUrl}}",
    },
    accountReady: {
      subject: "Your school account is ready",
      text: [
        "Hello {{name}},",
        "",
        "An account was created for you.",
        "",
        "Login email: {{email}}",
        "Temporary password: {{tempPassword}}",
        "",
        "You must change this password on first sign-in.",
        "",
        "Sign in: {{loginUrl}}",
      ].join("\n"),
    },
    guideWelcome: {
      subject: "Continue your Gnet SMS platform guide",
      text: "Hello {{name}},\n\nA short guide for your role is ready at {{schoolName}}.\n\nOpen it anytime: {{guideUrl}}\n\nYou can pause and resume — progress is saved to your account.",
    },
    emailVerify: {
      subject: "Verify your email — Gnet SMS",
      text: "Hello {{name}},\n\nConfirm your email address:\n{{verifyUrl}}\n\nThis link expires in 24 hours.",
    },
    passwordReset: {
      subject: "Reset your password — Gnet SMS",
      text: "Hello {{name}},\n\nReset your password:\n{{resetUrl}}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.",
    },
    applicationReceived: {
      subject: "Application received — {{schoolName}}",
      text: [
        "Your application has been received.",
        "",
        "Reference number: {{referenceNumber}}",
        "",
        "Open the link and type your reference number to check your admission status: {{statusUrl}}",
        "You can check anytime — your status updates automatically.",
        "",
        "Current status: Pending review",
        "Student: {{studentName}}",
        "Grade: {{gradeLevelName}}",
        "School: {{schoolName}}",
        "",
        "{{#if entranceUrl}}Entrance scheduling is open. Book your entrance appointment here: {{entranceUrl}} Booking deadline: {{entranceDeadline}}.{{else}}Entrance scheduling is not available yet. The school will contact you with the entrance details.{{/if}}",
        "",
        "This message was sent to the {{parentRole}}'s email address: {{parentEmail}}",
        "",
        "The registrar will review your application. You will receive an update when the status changes.",
      ].join("\n"),
    },
    entranceScheduled: {
      subject: "Entrance appointment scheduled — {{schoolName}}",
      text: [
        "Hello,",
        "",
        "The entrance appointment for {{studentName}} at {{schoolName}} has been booked.",
        "Reference number: {{referenceNumber}}",
        "Date and time: {{dateTime}}",
        "Location: {{location}}",
        "",
        "The school has been notified of this booking.",
        "You can check your admission status at {{statusUrl}} by typing your reference number.",
      ].join("\n"),
    },
  },
  fr: {
    registrationConfirm: {
      subject: "Confirmez votre inscription d'établissement",
      text: "Merci d'avoir postulé pour {{organizationName}}.\n\nConfirmez votre adresse e-mail pour finaliser votre demande :\n{{confirmUrl}}\n\nVotre demande n'est examinée qu'après confirmation de votre e-mail. Aucune autre étape n'est nécessaire après le clic.",
    },
    registrationNeedsInfo: {
      subject: "Informations complémentaires requises — YourSMS",
      text: "Concernant {{organizationName}} :\n\n{{notes}}",
    },
    registrationRejected: {
      subject: "Mise à jour de votre inscription — YourSMS",
      text: "Votre demande pour {{organizationName}} n'a pas été approuvée.\n\n{{notes}}",
    },
    welcomeSchool: {
      subject: "Bienvenue sur YourSMS — {{schoolName}}",
      text: [
        "Votre établissement « {{schoolName}} » est prêt.",
        "",
        "E-mail de connexion : {{email}}",
        "Mot de passe temporaire : {{tempPassword}}",
        "",
        "Ou définissez votre mot de passe : {{inviteUrl}}",
        "",
        "Chemin URL de l'établissement : /{{slug}}",
        "",
        "Cette invitation expire dans 7 jours.",
      ].join("\n"),
    },
    inviteResent: {
      subject: "Invitation YourSMS renvoyée — {{schoolName}}",
      text: "Connexion : {{email}}\nMot de passe temporaire : {{tempPassword}}\nDéfinir le mot de passe : {{inviteUrl}}",
    },
    accountReady: {
      subject: "Votre compte scolaire est prêt",
      text: [
        "Bonjour {{name}},",
        "",
        "Un compte a été créé pour vous.",
        "",
        "E-mail de connexion : {{email}}",
        "Mot de passe temporaire : {{tempPassword}}",
        "",
        "Vous devrez changer ce mot de passe lors de votre première connexion.",
        "",
        "Se connecter : {{loginUrl}}",
      ].join("\n"),
    },
    guideWelcome: {
      subject: "Continuez votre guide de plateforme Gnet SMS",
      text: "Bonjour {{name}},\n\nUn court guide adapté à votre rôle est prêt pour {{schoolName}}.\n\nOuvrez-le à tout moment : {{guideUrl}}\n\nVous pouvez faire une pause et reprendre — la progression est enregistrée.",
    },
    emailVerify: {
      subject: "Vérifiez votre e-mail — Gnet SMS",
      text: "Bonjour {{name}},\n\nConfirmez votre adresse e-mail :\n{{verifyUrl}}\n\nCe lien expire dans 24 heures.",
    },
    passwordReset: {
      subject: "Réinitialisez votre mot de passe — Gnet SMS",
      text: "Bonjour {{name}},\n\nRéinitialisez votre mot de passe :\n{{resetUrl}}\n\nCe lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    },
    applicationReceived: {
      subject: "Candidature reçue — {{schoolName}}",
      text: [
        "Votre candidature a été reçue.",
        "",
        "Numéro de référence : {{referenceNumber}}",
        "",
        "Ouvrez le lien et saisissez votre numéro de référence pour vérifier votre statut d'admission : {{statusUrl}}",
        "Vous pouvez vérifier à tout moment — votre statut se met à jour automatiquement.",
        "",
        "Statut actuel : En attente d'examen",
        "Étudiant : {{studentName}}",
        "Niveau : {{gradeLevelName}}",
        "Établissement : {{schoolName}}",
        "",
        "{{#if entranceUrl}}La réservation des créneaux d'entrée est ouverte. Réservez votre rendez-vous ici : {{entranceUrl}} Date limite de réservation : {{entranceDeadline}}.{{else}}La réservation des créneaux d'entrée n'est pas encore disponible. L'établissement vous contactera avec les informations sur l'entrée.{{/if}}",
        "",
        "Ce message a été envoyé à l'adresse e-mail de {{parentRole}} : {{parentEmail}}",
        "",
        "Le secrétariat examinera votre candidature. Vous recevrez une mise à jour lorsque le statut changera.",
      ].join("\n"),
    },
    entranceScheduled: {
      subject: "Rendez-vous d'entrée réservé — {{schoolName}}",
      text: [
        "Bonjour,",
        "",
        "Le rendez-vous d'entrée de {{studentName}} à {{schoolName}} est réservé.",
        "Numéro de référence : {{referenceNumber}}",
        "Date et heure : {{dateTime}}",
        "Lieu : {{location}}",
        "",
        "L'établissement a été informé de cette réservation.",
        "Vous pouvez vérifier votre statut d'admission sur {{statusUrl}} en saisissant votre numéro de référence.",
      ].join("\n"),
    },
  },
  ar: {
    registrationConfirm: {
      subject: "تأكيد تسجيل مدرستك",
      text: "شكرًا لتقديم الطلب نيابة عن {{organizationName}}.\n\nأكّد عنوان بريدك الإلكتروني لإكمال طلبك:\n{{confirmUrl}}\n\nلا تتم مراجعة طلبك إلا بعد تأكيد بريدك الإلكتروني. لا حاجة لأي خطوة أخرى بعد النقر.",
    },
    registrationNeedsInfo: {
      subject: "معلومات إضافية مطلوبة — YourSMS",
      text: "بخصوص {{organizationName}}:\n\n{{notes}}",
    },
    registrationRejected: {
      subject: "تحديث بخصوص تسجيل المدرسة — YourSMS",
      text: "لم تتم الموافقة على طلبك لـ {{organizationName}}.\n\n{{notes}}",
    },
    welcomeSchool: {
      subject: "مرحبًا بك في YourSMS — {{schoolName}}",
      text: [
        "مدرستك «{{schoolName}}» جاهزة.",
        "",
        "البريد الإلكتروني لتسجيل الدخول: {{email}}",
        "كلمة المرور المؤقتة: {{tempPassword}}",
        "",
        "أو عيّن كلمة مرورك: {{inviteUrl}}",
        "",
        "مسار URL للمدرسة: /{{slug}}",
        "",
        "تنتهي صلاحية هذه الدعوة خلال 7 أيام.",
      ].join("\n"),
    },
    inviteResent: {
      subject: "تم إعادة إرسال دعوة YourSMS — {{schoolName}}",
      text: "تسجيل الدخول: {{email}}\nكلمة المرور المؤقتة: {{tempPassword}}\nتعيين كلمة المرور: {{inviteUrl}}",
    },
    accountReady: {
      subject: "حسابك المدرسي جاهز",
      text: [
        "مرحبًا {{name}}،",
        "",
        "تم إنشاء حساب لك.",
        "",
        "البريد الإلكتروني لتسجيل الدخول: {{email}}",
        "كلمة المرور المؤقتة: {{tempPassword}}",
        "",
        "يجب عليك تغيير كلمة المرور هذه عند أول تسجيل دخول.",
        "",
        "تسجيل الدخول: {{loginUrl}}",
      ].join("\n"),
    },
    guideWelcome: {
      subject: "تابع دليل منصة Gnet SMS",
      text: "مرحبًا {{name}},\n\nدليل قصير لدورك جاهز في {{schoolName}}.\n\nافتحه في أي وقت: {{guideUrl}}\n\nيمكنك الإيقاف والمتابعة — يُحفظ التقدم في حسابك.",
    },
    emailVerify: {
      subject: "تحقق من بريدك الإلكتروني — Gnet SMS",
      text: "مرحبًا {{name}},\n\nأكد عنوان بريدك الإلكتروني:\n{{verifyUrl}}\n\nينتهي هذا الرابط خلال 24 ساعة.",
    },
    passwordReset: {
      subject: "إعادة تعيين كلمة المرور — Gnet SMS",
      text: "مرحبًا {{name}},\n\nأعد تعيين كلمة المرور:\n{{resetUrl}}\n\nينتهي هذا الرابط خلال ساعة. إذا لم تطلب ذلك، تجاهل هذه الرسالة.",
    },
    applicationReceived: {
      subject: "تم استلام الطلب — {{schoolName}}",
      text: [
        "تم استلام طلبك.",
        "",
        "رقم المرجع: {{referenceNumber}}",
        "",
        "افتح الرابط ثم أدخل رقم المرجع للتحقق من حالة القبول: {{statusUrl}}",
        "يمكنك التحقق في أي وقت — تتحدث حالتك تلقائيًا",
        "",
        "الحالة الحالية: قيد المراجعة",
        "الطالب: {{studentName}}",
        "الصف: {{gradeLevelName}}",
        "المدرسة: {{schoolName}}",
        "",
        "{{#if entranceUrl}}حجز موعد الاختبار المدرسي متاح الآن. احجز موعدك هنا: {{entranceUrl}} آخر موعد للحجز: {{entranceDeadline}}.{{else}}حجز موعد الاختبار المدرسي غير متاح بعد. ستتواصل معك المدرسة لتزويدك بتفاصيل الاختبار.{{/if}}",
        "",
        "أُرسلت هذه الرسالة إلى عنوان البريد الإلكتروني لـ {{parentRole}}: {{parentEmail}}",
        "",
        "سيراجع المسجّل طلبك. ستصلك تحديثات عند تغيّر الحالة.",
      ].join("\n"),
    },
    entranceScheduled: {
      subject: "تم حجز موعد الاختبار المدرسي — {{schoolName}}",
      text: [
        "مرحبًا،",
        "",
        "تم حجز موعد الاختبار المدرسي لـ {{studentName}} في {{schoolName}}.",
        "رقم المرجع: {{referenceNumber}}",
        "التاريخ والوقت: {{dateTime}}",
        "المكان: {{location}}",
        "",
        "تم إبلاغ المدرسة بهذا الحجز.",
        "يمكنك التحقق من حالة القبول عبر {{statusUrl}} بإدخال رقم المرجع.",
      ].join("\n"),
    },
  },
  es: {
    registrationConfirm: {
      subject: "Confirme el registro de su escuela",
      text: "Gracias por solicitar {{organizationName}}.\n\nConfirme su dirección de correo para completar su solicitud:\n{{confirmUrl}}\n\nSu solicitud solo se revisa después de confirmar su correo. No se requiere ninguna otra acción tras el clic.",
    },
    registrationNeedsInfo: {
      subject: "Se necesita información adicional — YourSMS",
      text: "Respecto a {{organizationName}}:\n\n{{notes}}",
    },
    registrationRejected: {
      subject: "Actualización del registro escolar — YourSMS",
      text: "Su solicitud para {{organizationName}} no fue aprobada.\n\n{{notes}}",
    },
    welcomeSchool: {
      subject: "Bienvenido a YourSMS — {{schoolName}}",
      text: [
        "Su escuela «{{schoolName}}» está lista.",
        "",
        "Correo de acceso: {{email}}",
        "Contraseña temporal: {{tempPassword}}",
        "",
        "O establezca su contraseña: {{inviteUrl}}",
        "",
        "Ruta URL de la escuela: /{{slug}}",
        "",
        "Esta invitación expira en 7 días.",
      ].join("\n"),
    },
    inviteResent: {
      subject: "Invitación de YourSMS reenviada — {{schoolName}}",
      text: "Acceso: {{email}}\nContraseña temporal: {{tempPassword}}\nEstablecer contraseña: {{inviteUrl}}",
    },
    accountReady: {
      subject: "Su cuenta escolar está lista",
      text: [
        "Hola {{name}},",
        "",
        "Se ha creado una cuenta para usted.",
        "",
        "Correo de acceso: {{email}}",
        "Contraseña temporal: {{tempPassword}}",
        "",
        "Debe cambiar esta contraseña en su primer inicio de sesión.",
        "",
        "Iniciar sesión: {{loginUrl}}",
      ].join("\n"),
    },
    guideWelcome: {
      subject: "Continúa tu guía de la plataforma Gnet SMS",
      text: "Hola {{name}},\n\nHay una guía breve para tu rol en {{schoolName}}.\n\nÁbrela cuando quieras: {{guideUrl}}\n\nPuedes pausar y reanudar — el progreso se guarda en tu cuenta.",
    },
    emailVerify: {
      subject: "Verifica tu correo — Gnet SMS",
      text: "Hola {{name}},\n\nConfirma tu dirección de correo:\n{{verifyUrl}}\n\nEste enlace caduca en 24 horas.",
    },
    passwordReset: {
      subject: "Restablece tu contraseña — Gnet SMS",
      text: "Hola {{name}},\n\nRestablece tu contraseña:\n{{resetUrl}}\n\nEste enlace caduca en 1 hora. Si no lo solicitaste, ignora este correo.",
    },
    applicationReceived: {
      subject: "Solicitud recibida — {{schoolName}}",
      text: [
        "Su solicitud ha sido recibida.",
        "",
        "Número de referencia: {{referenceNumber}}",
        "",
        "Abra el enlace y escriba su número de referencia para consultar su estado de admisión: {{statusUrl}}",
        "Puede consultar en cualquier momento — su estado se actualiza automáticamente.",
        "",
        "Estado actual: En revisión",
        "Estudiante: {{studentName}}",
        "Nivel: {{gradeLevelName}}",
        "Escuela: {{schoolName}}",
        "",
        "{{#if entranceUrl}}La reserva de citas de ingreso está abierta. Reserve su cita aquí: {{entranceUrl}} Fecha límite de reserva: {{entranceDeadline}}.{{else}}La reserva de citas de ingreso aún no está disponible. El colegio se pondrá en contacto con usted con los detalles.{{/if}}",
        "",
        "Este mensaje se envió a la dirección de correo de {{parentRole}}: {{parentEmail}}",
        "",
        "El registro revisará su solicitud. Recibirá una actualización cuando cambie el estado.",
      ].join("\n"),
    },
    entranceScheduled: {
      subject: "Cita de ingreso reservada — {{schoolName}}",
      text: [
        "Hola,",
        "",
        "La cita de ingreso de {{studentName}} en {{schoolName}} ha sido reservada.",
        "Número de referencia: {{referenceNumber}}",
        "Fecha y hora: {{dateTime}}",
        "Lugar: {{location}}",
        "",
        "El colegio ha sido informado de esta reserva.",
        "Puede consultar su estado de admisión en {{statusUrl}} escribiendo su número de referencia.",
      ].join("\n"),
    },
  },
  de: {
    registrationConfirm: {
      subject: "Bestätigen Sie Ihre Schulregistrierung",
      text: "Vielen Dank für Ihre Bewerbung für {{organizationName}}.\n\nBestätigen Sie Ihre E-Mail-Adresse, um Ihre Bewerbung abzuschließen:\n{{confirmUrl}}\n\nIhre Bewerbung wird erst nach Bestätigung Ihrer E-Mail-Adresse geprüft. Nach dem Klick ist keine weitere Aktion nötig.",
    },
    registrationNeedsInfo: {
      subject: "Zusätzliche Informationen erforderlich — YourSMS",
      text: "Betreffend {{organizationName}}:\n\n{{notes}}",
    },
    registrationRejected: {
      subject: "Aktualisierung zur Schulregistrierung — YourSMS",
      text: "Ihr Antrag für {{organizationName}} wurde nicht genehmigt.\n\n{{notes}}",
    },
    welcomeSchool: {
      subject: "Willkommen bei YourSMS — {{schoolName}}",
      text: [
        "Ihre Schule „{{schoolName}}“ ist bereit.",
        "",
        "Anmelde-E-Mail: {{email}}",
        "Temporäres Passwort: {{tempPassword}}",
        "",
        "Oder Passwort festlegen: {{inviteUrl}}",
        "",
        "Schul-URL-Pfad: /{{slug}}",
        "",
        "Diese Einladung läuft in 7 Tagen ab.",
      ].join("\n"),
    },
    inviteResent: {
      subject: "YourSMS-Einladung erneut gesendet — {{schoolName}}",
      text: "Anmeldung: {{email}}\nTemporäres Passwort: {{tempPassword}}\nPasswort festlegen: {{inviteUrl}}",
    },
    accountReady: {
      subject: "Ihr Schul-Konto ist bereit",
      text: [
        "Hallo {{name}},",
        "",
        "Für Sie wurde ein Konto erstellt.",
        "",
        "Anmelde-E-Mail: {{email}}",
        "Temporäres Passwort: {{tempPassword}}",
        "",
        "Sie müssen dieses Passwort bei der ersten Anmeldung ändern.",
        "",
        "Anmelden: {{loginUrl}}",
      ].join("\n"),
    },
    guideWelcome: {
      subject: "Setzen Sie Ihren Gnet-SMS-Plattformleitfaden fort",
      text: "Hallo {{name}},\n\nEin kurzer Leitfaden für Ihre Rolle ist bei {{schoolName}} bereit.\n\nJederzeit öffnen: {{guideUrl}}\n\nSie können pausieren und fortsetzen — der Fortschritt wird gespeichert.",
    },
    emailVerify: {
      subject: "E-Mail bestätigen — Gnet SMS",
      text: "Hallo {{name}},\n\nBestätigen Sie Ihre E-Mail-Adresse:\n{{verifyUrl}}\n\nDieser Link läuft in 24 Stunden ab.",
    },
    passwordReset: {
      subject: "Passwort zurücksetzen — Gnet SMS",
      text: "Hallo {{name}},\n\nSetzen Sie Ihr Passwort zurück:\n{{resetUrl}}\n\nDieser Link läuft in 1 Stunde ab. Wenn Sie das nicht angefordert haben, ignorieren Sie diese E-Mail.",
    },
    applicationReceived: {
      subject: "Bewerbung eingegangen — {{schoolName}}",
      text: [
        "Ihre Bewerbung ist eingegangen.",
        "",
        "Referenznummer: {{referenceNumber}}",
        "",
        "Öffnen Sie den Link und geben Sie Ihre Referenznummer ein, um Ihren Zulassungsstatus zu prüfen: {{statusUrl}}",
        "Sie können jederzeit nachsehen — Ihr Status wird automatisch aktualisiert.",
        "",
        "Aktueller Status: Wird geprüft",
        "Schüler: {{studentName}}",
        "Klasse: {{gradeLevelName}}",
        "Schule: {{schoolName}}",
        "",
        "{{#if entranceUrl}}Die Terminvereinbarung für die Aufnahmeprüfung ist geöffnet. Buchen Sie Ihren Termin hier: {{entranceUrl}} Buchungsfrist: {{entranceDeadline}}.{{else}}Die Terminvereinbarung für die Aufnahmeprüfung ist noch nicht verfügbar. Die Schule wird sich mit den Informationen zur Aufnahmeprüfung bei Ihnen melden.{{/if}}",
        "",
        "Diese Nachricht wurde an die E-Mail-Adresse von {{parentRole}} gesendet: {{parentEmail}}",
        "",
        "Die Schule wird Ihre Bewerbung prüfen. Sie erhalten eine Aktualisierung, sobald sich der Status ändert.",
      ].join("\n"),
    },
    entranceScheduled: {
      subject: "Aufnahmetermin gebucht — {{schoolName}}",
      text: [
        "Hallo,",
        "",
        "Der Aufnahmetermin für {{studentName}} an {{schoolName}} ist gebucht.",
        "Referenznummer: {{referenceNumber}}",
        "Datum und Uhrzeit: {{dateTime}}",
        "Ort: {{location}}",
        "",
        "Die Schule wurde über diese Buchung informiert.",
        "Sie können Ihren Zulassungsstatus unter {{statusUrl}} prüfen, indem Sie Ihre Referenznummer eingeben.",
      ].join("\n"),
    },
  },
  "zh-Hans": {
    registrationConfirm: {
      subject: "确认您的学校注册",
      text: "感谢您代表 {{organizationName}} 提交申请。\n\n请确认您的电子邮箱以完成申请：\n{{confirmUrl}}\n\n我们仅在您确认邮箱后才会审核您的申请。点击链接后无需其他操作。",
    },
    registrationNeedsInfo: {
      subject: "需要补充信息 — YourSMS",
      text: "关于 {{organizationName}}：\n\n{{notes}}",
    },
    registrationRejected: {
      subject: "学校注册状态更新 — YourSMS",
      text: "您为 {{organizationName}} 提交的申请未获批准。\n\n{{notes}}",
    },
    welcomeSchool: {
      subject: "欢迎使用 YourSMS — {{schoolName}}",
      text: [
        "您的学校「{{schoolName}}」已准备就绪。",
        "",
        "登录邮箱：{{email}}",
        "临时密码：{{tempPassword}}",
        "",
        "或设置您的密码：{{inviteUrl}}",
        "",
        "学校 URL 路径：/{{slug}}",
        "",
        "此邀请将在 7 天后过期。",
      ].join("\n"),
    },
    inviteResent: {
      subject: "YourSMS 邀请已重新发送 — {{schoolName}}",
      text: "登录：{{email}}\n临时密码：{{tempPassword}}\n设置密码：{{inviteUrl}}",
    },
    accountReady: {
      subject: "您的学校账户已就绪",
      text: [
        "您好 {{name}}，",
        "",
        "已为您创建账户。",
        "",
        "登录邮箱：{{email}}",
        "临时密码：{{tempPassword}}",
        "",
        "首次登录时必须更改此密码。",
        "",
        "登录：{{loginUrl}}",
      ].join("\n"),
    },
    guideWelcome: {
      subject: "继续您的 Gnet SMS 平台指南",
      text: "您好 {{name}}，\n\n{{schoolName}} 已为您准备了针对您角色的简短指南。\n\n随时打开：{{guideUrl}}\n\n可随时暂停与继续 — 进度会保存到您的账户。",
    },
    emailVerify: {
      subject: "验证您的邮箱 — Gnet SMS",
      text: "您好 {{name}}，\n\n请确认您的邮箱地址：\n{{verifyUrl}}\n\n此链接 24 小时内有效。",
    },
    passwordReset: {
      subject: "重置密码 — Gnet SMS",
      text: "您好 {{name}}，\n\n重置密码：\n{{resetUrl}}\n\n此链接 1 小时内有效。如非本人操作，请忽略此邮件。",
    },
    applicationReceived: {
      subject: "已收到申请 — {{schoolName}}",
      text: [
        "您的申请已收到。",
        "",
        "参考编号：{{referenceNumber}}",
        "",
        "打开链接并输入您的参考编号，即可查看录取状态：{{statusUrl}}",
        "您可随时查看 — 您的状态会自动更新。",
        "",
        "当前状态：待审核",
        "学生：{{studentName}}",
        "年级：{{gradeLevelName}}",
        "学校：{{schoolName}}",
        "",
        "{{#if entranceUrl}}入学测评预约现已开放。请在此预约：{{entranceUrl}} 预约截止时间：{{entranceDeadline}}。{{else}}入学测评预约尚未开放。学校将另行通知您测评安排。{{/if}}",
        "",
        "此邮件已发送至{{parentRole}}的邮箱：{{parentEmail}}",
        "",
        "教务将审核您的申请。状态变化时您将收到更新。",
      ].join("\n"),
    },
    entranceScheduled: {
      subject: "入学测评已预约 — {{schoolName}}",
      text: [
        "您好，",
        "",
        "{{studentName}} 在 {{schoolName}} 的入学测评已预约成功。",
        "参考编号：{{referenceNumber}}",
        "日期和时间：{{dateTime}}",
        "地点：{{location}}",
        "",
        "学校已收到此预约通知。",
        "您可以在 {{statusUrl}} 输入参考编号查看录取状态。",
      ].join("\n"),
    },
  },
  hi: {
    registrationConfirm: {
      subject: "अपने स्कूल पंजीकरण की पुष्टि करें",
      text: "{{organizationName}} की ओर से आवेदन करने के लिए धन्यवाद।\n\nअपना आवेदन पूरा करने के लिए अपना ईमेल पता पुष्टि करें:\n{{confirmUrl}}\n\nआपका आवेदन ईमेल पुष्टि के बाद ही समीक्षा किया जाएगा। क्लिक के बाद कोई और कदम आवश्यक नहीं है।",
    },
    registrationNeedsInfo: {
      subject: "अतिरिक्त जानकारी आवश्यक — YourSMS",
      text: "{{organizationName}} के संबंध में:\n\n{{notes}}",
    },
    registrationRejected: {
      subject: "स्कूल पंजीकरण अपडेट — YourSMS",
      text: "{{organizationName}} के लिए आपका आवेदन स्वीकृत नहीं हुआ।\n\n{{notes}}",
    },
    welcomeSchool: {
      subject: "YourSMS में आपका स्वागत है — {{schoolName}}",
      text: [
        "आपका स्कूल «{{schoolName}}» तैयार है।",
        "",
        "लॉगिन ईमेल: {{email}}",
        "अस्थायी पासवर्ड: {{tempPassword}}",
        "",
        "या अपना पासवर्ड सेट करें: {{inviteUrl}}",
        "",
        "स्कूल URL पथ: /{{slug}}",
        "",
        "यह निमंत्रण 7 दिनों में समाप्त हो जाएगा।",
      ].join("\n"),
    },
    inviteResent: {
      subject: "YourSMS निमंत्रण पुनः भेजा गया — {{schoolName}}",
      text: "लॉगिन: {{email}}\nअस्थायी पासवर्ड: {{tempPassword}}\nपासवर्ड सेट करें: {{inviteUrl}}",
    },
    accountReady: {
      subject: "आपका स्कूल खाता तैयार है",
      text: [
        "नमस्ते {{name}},",
        "",
        "आपके लिए एक खाता बनाया गया है।",
        "",
        "लॉगिन ईमेल: {{email}}",
        "अस्थायी पासवर्ड: {{tempPassword}}",
        "",
        "पहली बार साइन इन करते समय आपको यह पासवर्ड बदलना होगा।",
        "",
        "साइन इन करें: {{loginUrl}}",
      ].join("\n"),
    },
    guideWelcome: {
      subject: "अपना Gnet SMS प्लेटफ़ॉर्म गाइड जारी रखें",
      text: "नमस्ते {{name}},\n\n{{schoolName}} पर आपकी भूमिका के लिए एक संक्षिप्त गाइड तैयार है।\n\nकभी भी खोलें: {{guideUrl}}\n\nआप रोक सकते हैं और फिर जारी रख सकते हैं — प्रगति आपके खाते में सहेजी जाती है।",
    },
    emailVerify: {
      subject: "अपना ईमेल सत्यापित करें — Gnet SMS",
      text: "नमस्ते {{name}},\n\nअपना ईमेल पता पुष्टि करें:\n{{verifyUrl}}\n\nयह लिंक 24 घंटे में समाप्त हो जाता है।",
    },
    passwordReset: {
      subject: "अपना पासवर्ड रीसेट करें — Gnet SMS",
      text: "नमस्ते {{name}},\n\nअपना पासवर्ड रीसेट करें:\n{{resetUrl}}\n\nयह लिंक 1 घंटे में समाप्त हो जाता है। यदि आपने अनुरोध नहीं किया, तो इस ईमेल को अनदेखा करें।",
    },
    applicationReceived: {
      subject: "आवेदन प्राप्त हुआ — {{schoolName}}",
      text: [
        "आपका आवेदन प्राप्त हो गया है।",
        "",
        "संदर्भ संख्या: {{referenceNumber}}",
        "",
        "अपनी प्रवेश स्थिति देखने के लिए लिंक खोलें और अपनी संदर्भ संख्या दर्ज करें: {{statusUrl}}",
        "आप कभी भी जांच सकते हैं — आपकी स्थिति अपने आप अपडेट हो जाती है।",
        "",
        "वर्तमान स्थिति: समीक्षा लंबित",
        "छात्र: {{studentName}}",
        "कक्षा: {{gradeLevelName}}",
        "स्कूल: {{schoolName}}",
        "",
        "{{#if entranceUrl}}प्रवेश परीक्षा के लिए स्लॉट बुकिंग अब उपलब्ध है। यहां अपना स्लॉट बुक करें: {{entranceUrl}} बुकिंग की अंतिम तिथि: {{entranceDeadline}}।{{else}}प्रवेश परीक्षा की स्लॉट बुकिंग अभी उपलब्ध नहीं है। स्कूल आपको परीक्षा की जानकारी भेजेगा।{{/if}}",
        "",
        "यह संदेश {{parentRole}} के ईमेल पते पर भेजा गया है: {{parentEmail}}",
        "",
        "पंजीकरण अधिकारी आपके आवेदन की समीक्षा करेगा। स्थिति बदलने पर आपको अपडेट मिलेगा।",
      ].join("\n"),
    },
    entranceScheduled: {
      subject: "प्रवेश परीक्षा स्लॉट बुक — {{schoolName}}",
      text: [
        "नमस्ते,",
        "",
        "{{studentName}} के लिए {{schoolName}} में प्रवेश परीक्षा का स्लॉट बुक हो गया है।",
        "संदर्भ संख्या: {{referenceNumber}}",
        "दिनांक और समय: {{dateTime}}",
        "स्थान: {{location}}",
        "",
        "स्कूल को इस बुकिंग की सूचना दे दी गई है।",
        "आप {{statusUrl}} पर अपनी संदर्भ संख्या दर्ज करके प्रवेश स्थिति देख सकते हैं।",
      ].join("\n"),
    },
  },
};

export function tEmail(
  locale: AppLocale,
  key: EmailMessageKey,
  vars: Record<string, string>
): { subject: string; text: string } {
  const catalog = EMAIL_CATALOGS[locale] ?? EMAIL_CATALOGS.en;
  const msg = catalog[key] ?? EMAIL_CATALOGS.en[key];
  return {
    subject: interpolate(msg.subject, vars),
    text: interpolate(msg.text, vars),
  };
}
