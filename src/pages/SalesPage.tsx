import { useEffect, useMemo, useState } from 'react';
import type { CatalogProduct } from '../../shared/catalog';
import type { CustomerRecord } from '../../shared/contacts';
import type { SalesInvoice } from '../../shared/sales';
import { useI18n } from '../i18n';

const emptyLine = {
  productId: 0,
  quantity: 1,
};

export function SalesPage() {
  const { t } = useI18n();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [paymentMethodId, setPaymentMethodId] = useState(0);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [lineProductId, setLineProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [items, setItems] = useState<Array<{ productId: number; quantity: number; unitPriceCents: number; productName: string }>>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [printingId, setPrintingId] = useState<number | null>(null);

  useEffect(() => {
    void Promise.all([loadInvoices(), loadProducts(), loadCustomers(), loadPaymentMethods()]);
  }, []);

  async function loadInvoices() {
    const results = await window.api.sales.listSalesInvoices();
    setInvoices(results);
  }

  async function loadProducts() {
    const results = await window.api.catalog.listProducts();
    setProducts(results as CatalogProduct[]);
  }

  async function loadCustomers() {
    setCustomers(await window.api.customers.listCustomers());
  }

  async function loadPaymentMethods() {
    const methods = await window.api.treasury.listPaymentMethods();
    setPaymentMethods(methods);
    if (methods[0]) setPaymentMethodId(methods[0].id);
  }

  const totals = useMemo(() => {
    return items.reduce(
      (accumulator, item) => {
        const subtotal = item.quantity * item.unitPriceCents;
        return {
          subtotal: accumulator.subtotal + subtotal,
          total: accumulator.total + subtotal,
        };
      },
      { subtotal: 0, total: 0 },
    );
  }, [items]);

  function addLine() {
    if (!lineProductId) {
      setError('Select a product first.');
      return;
    }

    const selectedProduct = products.find((product) => product.id === lineProductId);
    if (!selectedProduct) {
      setError('Selected product was not found.');
      return;
    }

    if (quantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    const existing = items.find((item) => item.productId === selectedProduct.id);
    if (existing) {
      setItems((previous) => previous.map((item) =>
        item.productId === selectedProduct.id
          ? { ...item, quantity: item.quantity + quantity }
          : item,
      ));
    } else {
      setItems((previous) => [...previous, {
        productId: selectedProduct.id,
        quantity,
        unitPriceCents: selectedProduct.sellingPriceCents,
        productName: selectedProduct.name,
      }]);
    }

    setError('');
    setLineProductId(0);
    setQuantity(1);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0) {
      setError('Add at least one product to the sale.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const session = await window.api.auth.getSession();
      if (!session) throw new Error('No active cashier session found.');

      await window.api.sales.createSalesInvoice({
        customerId,
        cashierId: session.id,
        paymentMethodId,
        notes: notes || null,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          discountCents: 0,
        })),
      });

      setItems([]);
      setCustomerId(null);
      setNotes('');
      setLineProductId(0);
      setQuantity(1);
      await loadInvoices();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to record sale.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePrint(invoiceId: number) {
    setError('');
    setPrintingId(invoiceId);
    try {
      await window.api.sales.printSalesInvoice(invoiceId);
    } catch (printError) {
      setError(printError instanceof Error ? printError.message : 'Unable to print invoice.');
    } finally {
      setPrintingId(null);
    }
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Operational workflow</p>
          <h1>{t('sales')}</h1>
          <p className="heading-copy">Create local sales transactions while keeping inventory and cash movement in sync.</p>
        </div>
      </div>

      <form className="panel-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>Customer
            <select value={customerId ?? ''} onChange={(event) => setCustomerId(Number(event.target.value) || null)}>
              <option value="">Walk-in customer</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
          </label>
          <label>Product
            <select value={lineProductId} onChange={(event) => setLineProductId(Number(event.target.value))}>
              <option value={0}>-- Select product --</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </label>
          <label>Quantity<input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value) || 1)} /></label>
          <label>Payment method<select value={paymentMethodId} onChange={(event) => setPaymentMethodId(Number(event.target.value))}>
            {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
          </select></label>
          <button type="button" className="auth-submit" style={{ marginTop: 22 }} onClick={addLine}>Add line</button>
          <label className="full-width">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="table-panel" style={{ marginTop: 18 }}>
          <div className="table-toolbar"><strong>Current sale</strong></div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={4}>No items added yet.</td></tr>
              ) : items.map((item) => (
                <tr key={item.productId}>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unitPriceCents}</td>
                  <td>{item.quantity * item.unitPriceCents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, fontSize: 13, color: '#3b3b34' }}>
          <strong>Subtotal</strong>
          <span>{totals.subtotal}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, color: '#3b3b34' }}>
          <strong>Total</strong>
          <span>{totals.total}</span>
        </div>

        <button className="auth-submit" type="submit" disabled={saving} style={{ marginTop: 18 }}>{saving ? 'Recording sale...' : 'Record sale'}</button>
      </form>

      <div className="table-panel">
        <div className="table-toolbar">
          <strong>Recent invoices</strong>
        </div>
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Status</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoiceNumber}</td>
                <td>{invoice.status}</td>
                <td>{invoice.customerName ?? 'Walk-in'}</td>
                <td>{invoice.totalCents}</td>
                <td><button type="button" className="tiny-button" onClick={() => void handlePrint(invoice.id)} disabled={printingId === invoice.id}>{printingId === invoice.id ? 'Printing...' : 'Print'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
