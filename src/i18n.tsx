import { createContext, useContext, useEffect, type PropsWithChildren } from 'react';
import type { SupportedLocale } from '../shared/api';

type TranslationKey =
  | 'dashboard' | 'sales' | 'returns' | 'inventory' | 'stockAdjustments' | 'purchases'
  | 'purchaseReturns' | 'customers' | 'suppliers' | 'treasury' | 'reports' | 'operations'
  | 'accounts' | 'settings' | 'logout' | 'workspace' | 'overview' | 'offlineWorkspace'
  | 'steelOperations' | 'language' | 'english' | 'arabic' | 'secureLocalAccess'
  | 'createAdministrator' | 'welcomeBack' | 'setupAdmin' | 'signInContinue'
  | 'username' | 'displayName' | 'password' | 'checking' | 'createAccount' | 'signIn'
  | 'credentialsLocal' | 'goodMorning' | 'liveOverview' | 'refresh' | 'analytics'
  | 'operationalSummary' | 'salesTotal' | 'inventoryValue' | 'treasuryFlow'
  | 'recentTreasuryActivity' | 'noTreasuryActivity';

const dictionary: Record<SupportedLocale, Record<TranslationKey, string>> = {
  en: {
    dashboard: 'Dashboard', sales: 'Sales / POS', returns: 'Returns', inventory: 'Inventory', stockAdjustments: 'Stock adjustments', purchases: 'Purchases', purchaseReturns: 'Purchase returns', customers: 'Customers', suppliers: 'Suppliers', treasury: 'Treasury', reports: 'Reports', operations: 'Operations', accounts: 'Account management', settings: 'Settings', logout: 'Log out', workspace: 'Workspace', overview: 'Overview', offlineWorkspace: 'Offline workspace', steelOperations: 'Steel operations', language: 'Language', english: 'English', arabic: 'Arabic', secureLocalAccess: 'Secure local access', createAdministrator: 'Create administrator', welcomeBack: 'Welcome back.', setupAdmin: 'Set up the first administrator account for this offline workspace.', signInContinue: 'Sign in to continue to your workspace.', username: 'Username', displayName: 'Display name', password: 'Password', checking: 'Checking...', createAccount: 'Create account', signIn: 'Sign in', credentialsLocal: 'Credentials are stored locally and never sent to a server.', goodMorning: 'Good morning.', liveOverview: 'A live view of your local steel operations.', refresh: 'Refresh', analytics: 'Analytics', operationalSummary: 'Operational summary built from the local SQLite ledger.', salesTotal: 'Sales', inventoryValue: 'Inventory', treasuryFlow: 'Treasury flow', recentTreasuryActivity: 'Recent treasury activity', noTreasuryActivity: 'No treasury activity recorded yet.',
  },
  ar: {
    dashboard: 'لوحة التحكم', sales: 'المبيعات / نقطة البيع', returns: 'المرتجعات', inventory: 'المخزون', stockAdjustments: 'تسويات المخزون', purchases: 'المشتريات', purchaseReturns: 'مرتجعات المشتريات', customers: 'العملاء', suppliers: 'الموردون', treasury: 'الخزينة', reports: 'التقارير', operations: 'العمليات', accounts: 'إدارة الحسابات', settings: 'الإعدادات', logout: 'تسجيل الخروج', workspace: 'مساحة العمل', overview: 'نظرة عامة', offlineWorkspace: 'مساحة عمل غير متصلة', steelOperations: 'عمليات الحديد', language: 'اللغة', english: 'English', arabic: 'العربية', secureLocalAccess: 'دخول محلي آمن', createAdministrator: 'إنشاء مدير', welcomeBack: 'مرحباً بعودتك.', setupAdmin: 'أنشئ حساب المدير الأول لمساحة العمل غير المتصلة.', signInContinue: 'سجل الدخول للمتابعة إلى مساحة العمل.', username: 'اسم المستخدم', displayName: 'الاسم الظاهر', password: 'كلمة المرور', checking: 'جارٍ التحقق...', createAccount: 'إنشاء الحساب', signIn: 'تسجيل الدخول', credentialsLocal: 'يتم تخزين بيانات الدخول محلياً ولا يتم إرسالها إلى أي خادم.', goodMorning: 'صباح الخير.', liveOverview: 'نظرة مباشرة على عمليات الحديد المحلية.', refresh: 'تحديث', analytics: 'التحليلات', operationalSummary: 'ملخص العمليات من سجل SQLite المحلي.', salesTotal: 'المبيعات', inventoryValue: 'قيمة المخزون', treasuryFlow: 'حركة الخزينة', recentTreasuryActivity: 'آخر حركة للخزينة', noTreasuryActivity: 'لا توجد حركة خزينة مسجلة بعد.',
  },
};

const uiTranslations: Record<string, string> = {
  'Control panel': 'لوحة التحكم',
  'Create and maintain local users, roles, and access for the offline POS workspace.': 'إنشاء وإدارة المستخدمين والأدوار والصلاحيات لمساحة العمل غير المتصلة.',
  'Create user': 'إنشاء مستخدم', 'Save user': 'حفظ المستخدم', 'Reset password': 'إعادة تعيين كلمة المرور', 'New password': 'كلمة المرور الجديدة',
  'Cashier': 'كاشير', 'Administrator': 'مدير', 'Select user': 'اختر مستخدماً', 'User accounts': 'حسابات المستخدمين', 'Active': 'نشط', 'Disabled': 'معطل', 'Never': 'أبداً', 'Enable': 'تفعيل', 'Disable': 'تعطيل', 'Last login': 'آخر دخول', 'Action': 'إجراء', 'Status': 'الحالة', 'Role': 'الدور',
  'Phase 4': 'المرحلة 4', 'Units, categories, and products are managed through the Electron Main process.': 'تتم إدارة الوحدات والتصنيفات والمنتجات عبر عملية Electron الرئيسية.', 'Category name': 'اسم التصنيف', 'Arabic name': 'الاسم بالعربية', 'Description': 'الوصف', 'Create category': 'إنشاء تصنيف', 'Save category': 'حفظ التصنيف', 'Categories': 'التصنيفات', 'Edit': 'تعديل', 'Archive': 'أرشفة', 'Low-stock alerts': 'تنبيهات انخفاض المخزون', 'No low-stock products.': 'لا توجد منتجات منخفضة المخزون.', 'Product': 'المنتج', 'Current stock': 'المخزون الحالي', 'Minimum': 'الحد الأدنى', 'Shortage': 'العجز', 'Products': 'المنتجات', 'Search products': 'البحث عن المنتجات', 'SKU': 'رمز المنتج', 'Barcode': 'الباركود', 'English name': 'الاسم بالإنجليزية', 'Category': 'التصنيف', 'Unit': 'الوحدة', 'Purchase price': 'سعر الشراء', 'Selling price': 'سعر البيع', 'Minimum stock': 'الحد الأدنى للمخزون', 'Cancel edit': 'إلغاء التعديل', 'Create product': 'إنشاء منتج', 'Save product': 'حفظ المنتج',
  'Next phase': 'المرحلة التالية', 'Offline customer master records are managed in the local SQLite database.': 'تتم إدارة سجلات العملاء محلياً في قاعدة بيانات SQLite.', 'Name': 'الاسم', 'Phone': 'الهاتف', 'Address': 'العنوان', 'Notes': 'ملاحظات', 'Create customer': 'إنشاء عميل', 'Save customer': 'حفظ العميل', 'Search customers': 'البحث عن العملاء', 'Customer records': 'سجلات العملاء', 'Create supplier': 'إنشاء مورد', 'Save supplier': 'حفظ المورد', 'Search suppliers': 'البحث عن الموردين', 'Supplier records': 'سجلات الموردين', 'Supplier records stay local and work fully offline with the same secure IPC flow.': 'تبقى سجلات الموردين محلية وتعمل دون اتصال عبر قناة IPC الآمنة.',
  'Operational workflow': 'سير العمل التشغيلي', 'Create local sales transactions while keeping inventory and cash movement in sync.': 'إنشاء معاملات مبيعات محلية مع مزامنة المخزون وحركة النقد.', 'Walk-in customer': 'عميل نقدي', 'Quantity': 'الكمية', 'Payment method': 'طريقة الدفع', 'Add line': 'إضافة بند', 'Current sale': 'المبيعة الحالية', 'No items added yet.': 'لم تتم إضافة بنود بعد.', 'Subtotal': 'الإجمالي الفرعي', 'Total': 'الإجمالي', 'Record sale': 'تسجيل المبيعة', 'Recording sale...': 'جارٍ تسجيل المبيعة...', 'Recent invoices': 'الفواتير الأخيرة', 'Invoice': 'الفاتورة', 'Customer': 'العميل', 'Print': 'طباعة', 'Printing...': 'جارٍ الطباعة...',
  'Procurement': 'المشتريات', 'Track supplier purchases and update stock automatically in the offline ledger.': 'تتبع مشتريات الموردين وتحديث المخزون تلقائياً في السجل المحلي.', 'Direct purchase': 'شراء مباشر', 'Unit cost': 'تكلفة الوحدة', 'Purchase draft': 'مسودة الشراء', 'Record purchase': 'تسجيل الشراء', 'Recording purchase...': 'جارٍ تسجيل الشراء...', 'Recent purchase invoices': 'آخر فواتير الشراء', 'Supplier': 'المورد',
  'Track offline treasury movement and expense entries.': 'تتبع حركة الخزينة والمصروفات دون اتصال.', 'Amount (cents)': 'المبلغ (بالقروش)', 'Record expense': 'تسجيل المصروف', 'Recording expense...': 'جارٍ تسجيل المصروف...', 'Cash in': 'النقد الداخل', 'Cash out': 'النقد الخارج', 'Recorded inflow': 'التدفق الداخل المسجل', 'Recorded expenses': 'المصروفات المسجلة', 'Recent treasury flow': 'آخر حركة للخزينة', 'Payment type': 'نوع الدفع', 'Customer payment received': 'دفعة مستلمة من العميل', 'Supplier payment sent': 'دفعة مرسلة للمورد', 'Party ID': 'معرف الطرف', 'Invoice ID': 'معرف الفاتورة', 'Payment description': 'وصف الدفع', 'Record payment': 'تسجيل الدفعة', 'Recording payment...': 'جارٍ تسجيل الدفعة...',
  'Analytics': 'التحليلات', 'Operational summary built from the local SQLite ledger.': 'ملخص العمليات من سجل SQLite المحلي.', 'Export CSV': 'تصدير CSV', 'Exporting...': 'جارٍ التصدير...', 'Purchases': 'المشتريات', 'Expenses': 'المصروفات', 'Inventory value': 'قيمة المخزون', 'Stock on hand': 'المخزون المتاح', 'Active records': 'السجلات النشطة', 'Sales by day (last 7 days)': 'المبيعات حسب اليوم (آخر 7 أيام)', 'No sales recorded yet.': 'لا توجد مبيعات مسجلة بعد.', 'Top selling products': 'المنتجات الأكثر مبيعاً', 'No sales items available.': 'لا توجد منتجات مباعة بعد.', 'Date': 'التاريخ', 'Qty': 'الكمية',
  'Inventory control': 'التحكم بالمخزون', 'Correct physical counts with a reasoned, local inventory movement.': 'تصحيح الكميات الفعلية بحركة مخزون محلية موثقة.', 'Select product': 'اختر منتجاً', 'Quantity change': 'تغيير الكمية', 'Positive or negative': 'موجب أو سالب', 'Apply adjustment': 'تطبيق التسوية', 'Adjustment history': 'سجل التسويات', 'Reason': 'السبب', 'Created by': 'أنشأه', 'Created': 'تاريخ الإنشاء',
  'Operations': 'العمليات', 'Track local cashier sessions and the activity trail kept in SQLite.': 'تتبع جلسات الكاشير المحلية وسجل النشاط المحفوظ في SQLite.', 'Opening cash (EGP)': 'النقد الافتتاحي (جنيه)', 'Closing cash (EGP)': 'النقد الختامي (جنيه)', 'Expected cash (EGP)': 'النقد المتوقع (جنيه)', 'Closing notes': 'ملاحظات الإغلاق', 'Open cashier shift': 'فتح وردية الكاشير', 'Close cashier shift': 'إغلاق وردية الكاشير', 'Shift already open': 'الوردية مفتوحة بالفعل', 'No open shift': 'لا توجد وردية مفتوحة', 'Cashier shifts': 'ورديات الكاشير', 'Audit log': 'سجل التدقيق', 'Time': 'الوقت', 'Difference': 'الفرق',
  'Configure the local POS workspace for your steel operations.': 'إعداد مساحة نقاط البيع المحلية لعمليات الحديد.', 'Company name': 'اسم الشركة', 'Workday start': 'بداية يوم العمل', 'Save settings': 'حفظ الإعدادات', 'Saved values': 'القيم المحفوظة', 'Offline backups': 'النسخ الاحتياطية المحلية', 'Create backup': 'إنشاء نسخة احتياطية', 'Working...': 'جارٍ التنفيذ...', 'Restore': 'استعادة', 'Restoring...': 'جارٍ الاستعادة...', 'File': 'الملف', 'Updated': 'آخر تحديث', 'Size': 'الحجم',
  'Sales': 'المبيعات', 'Create offline sales returns and restock products back into inventory.': 'إنشاء مرتجعات مبيعات محلية وإعادة المنتجات إلى المخزون.', 'Refund amount (EGP)': 'قيمة الاسترداد (جنيه)', 'Create return': 'إنشاء مرتجع', 'Sales returns': 'مرتجعات المبيعات', 'Return #': 'رقم المرتجع', 'Original invoice ID': 'معرف الفاتورة الأصلية', 'Original item ID': 'معرف البند الأصلي', 'Supplier returns': 'مرتجعات الموردين', 'Create purchase return': 'إنشاء مرتجع شراء', 'Return supplier goods and reduce local stock with an auditable inventory movement.': 'إرجاع بضائع المورد وتقليل المخزون بحركة قابلة للتدقيق.',
  'English': 'الإنجليزية', 'Arabic': 'العربية', 'Saving...': 'جارٍ الحفظ...', 'Unable to save product.': 'تعذر حفظ المنتج.', 'Unable to save category.': 'تعذر حفظ التصنيف.', 'Unable to archive product.': 'تعذر أرشفة المنتج.', 'Unable to archive category.': 'تعذر أرشفة التصنيف.', 'Unable to save customer.': 'تعذر حفظ العميل.', 'Unable to archive customer.': 'تعذر أرشفة العميل.', 'Unable to save supplier.': 'تعذر حفظ المورد.', 'Unable to archive supplier.': 'تعذر أرشفة المورد.', 'Unable to load dashboard.': 'تعذر تحميل لوحة التحكم.', 'Unable to adjust stock.': 'تعذر تسوية المخزون.', 'Unable to open shift.': 'تعذر فتح الوردية.', 'Unable to close shift.': 'تعذر إغلاق الوردية.', 'Unable to create purchase return.': 'تعذر إنشاء مرتجع الشراء.', 'Unable to record purchase.': 'تعذر تسجيل الشراء.', 'Unable to record sale.': 'تعذر تسجيل المبيعة.', 'Unable to authenticate.': 'تعذر تسجيل الدخول.', 'Unable to create user.': 'تعذر إنشاء المستخدم.', 'Unable to update user.': 'تعذر تحديث المستخدم.', 'Unable to reset password.': 'تعذر إعادة تعيين كلمة المرور.', 'Unable to create sales return.': 'تعذر إنشاء مرتجع المبيعات.', 'Unable to save settings.': 'تعذر حفظ الإعدادات.', 'Unable to create backup.': 'تعذر إنشاء النسخة الاحتياطية.', 'Unable to restore backup.': 'تعذر استعادة النسخة الاحتياطية.', 'Unable to record payment.': 'تعذر تسجيل الدفعة.', 'Unable to save expense.': 'تعذر حفظ المصروف.', 'Unable to load reports.': 'تعذر تحميل التقارير.', 'Unable to export reports.': 'تعذر تصدير التقارير.', 'Select a product first.': 'اختر منتجاً أولاً.', 'Selected product was not found.': 'لم يتم العثور على المنتج المحدد.', 'Quantity must be greater than zero.': 'يجب أن تكون الكمية أكبر من صفر.', 'Add at least one product to the sale.': 'أضف منتجاً واحداً على الأقل إلى المبيعة.', 'Add at least one product to the purchase.': 'أضف منتجاً واحداً على الأقل إلى الشراء.', 'No active user session found.': 'لا توجد جلسة مستخدم نشطة.', 'No active cashier session found.': 'لا توجد جلسة كاشير نشطة.', 'No data for chart': 'لا توجد بيانات للرسم البياني.', 'Total invoiced': 'إجمالي الفواتير', 'Inventory bought': 'المخزون المشترى', 'Operational costs': 'التكاليف التشغيلية', 'Chart': 'رسم بياني',
};

const reverseUiTranslations = Object.fromEntries(Object.entries(uiTranslations).map(([english, arabic]) => [arabic, english]));

export function localizeMessage(locale: SupportedLocale, message: string): string {
  if (!message) return '';
  if (locale !== 'ar') return message;

  const directMatch = uiTranslations[message];
  if (directMatch) return directMatch;

  const reversedMatch = reverseUiTranslations[message];
  if (reversedMatch) return reversedMatch;

  return message;
}

function translateRenderedUi(locale: SupportedLocale): void {
  const replacements = locale === 'ar' ? uiTranslations : reverseUiTranslations;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) nodes.push(node as Text);
  for (const textNode of nodes) {
    const replacement = replacements[textNode.nodeValue?.trim() ?? ''];
    if (replacement) textNode.nodeValue = textNode.nodeValue!.replace(textNode.nodeValue!.trim(), replacement);
  }
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[placeholder]').forEach((element) => {
    const replacement = replacements[element.placeholder];
    if (replacement) element.placeholder = replacement;
  });
  document.querySelectorAll<HTMLElement>('[aria-label], [title]').forEach((element) => {
    for (const attribute of ['aria-label', 'title']) {
      const value = element.getAttribute(attribute);
      const replacement = value ? replacements[value] : undefined;
      if (replacement) element.setAttribute(attribute, replacement);
    }
  });
}

const I18nContext = createContext<{ locale: SupportedLocale; t: (key: TranslationKey) => string }>({
  locale: 'en',
  t: (key) => dictionary.en[key],
});

export function I18nProvider({ locale, children }: PropsWithChildren<{ locale: SupportedLocale }>) {
  useEffect(() => {
    let translating = false;
    const apply = () => {
      if (translating) return;
      translating = true;
      translateRenderedUi(locale);
      translating = false;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [locale]);

  return <I18nContext.Provider value={{ locale, t: (key) => dictionary[locale][key] }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
