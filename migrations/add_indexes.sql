-- Добавляем индексы для ускорения запросов

-- Индексы для пользователей
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Индексы для поставщиков
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_bin ON suppliers(bin);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_created_at ON suppliers(created_at);

-- Индексы для покупателей  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buyers_user_id ON buyers(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buyers_bin ON buyers(bin);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buyers_name ON buyers(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buyers_created_at ON buyers(created_at);

-- Индексы для счетов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_supplier_id ON invoices(supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_buyer_id ON invoices(buyer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_updated_at ON invoices(updated_at);

-- Составные индексы для частых запросов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_user_status ON invoices(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_user_date ON invoices(user_id, invoice_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_user_created ON invoices(user_id, created_at DESC);

-- Индексы для элементов счетов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_items_sort_order ON invoice_items(invoice_id, sort_order);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_items_name ON invoice_items(name);

-- Индексы для настроек подписи
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signature_settings_user_id ON signature_settings(user_id);

-- Полнотекстовый поиск для счетов и услуг (опционально)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_search 
-- ON invoices USING gin(to_tsvector('russian', invoice_number || ' ' || COALESCE(contract, '')));

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_items_search 
-- ON invoice_items USING gin(to_tsvector('russian', name));

-- Статистика использования индексов
-- SELECT schemaname, tablename, attname, n_distinct, correlation 
-- FROM pg_stats WHERE schemaname = 'public';