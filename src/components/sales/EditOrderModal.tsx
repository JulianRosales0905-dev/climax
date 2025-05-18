import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { Sale, Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  product: Product;
  onSave: (updatedSale: Sale) => Promise<void>;
  onDelete: (saleId: string) => Promise<void>;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  onClose,
  sale,
  product,
  onSave,
  onDelete,
}) => {
  const [quantity, setQuantity] = useState(sale.quantity.toString());
  const [paymentMethod, setPaymentMethod] = useState(sale.paymentMethod);
  const [tableNumber, setTableNumber] = useState(sale.tableNumber || '');
  const [isFriendPrice, setIsFriendPrice] = useState(false);
  const [friendPrice, setFriendPrice] = useState(product.price.toString());
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState('0');
  const [nequiAmount, setNequiAmount] = useState('0');

  useEffect(() => {
    const currentUnitPrice = sale.totalPrice / sale.quantity;
    setIsFriendPrice(currentUnitPrice !== product.price);
    setFriendPrice(currentUnitPrice.toString());

    // Reset split payment amounts when total changes
    const total = Number(quantity) * (isFriendPrice ? Number(friendPrice) : product.price);
    setCashAmount(total.toString());
    setNequiAmount('0');
  }, [sale, product.price, quantity, isFriendPrice, friendPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantityNum = Number(quantity);
    if (product.quantity !== null && quantityNum > product.quantity) {
      alert('No hay suficiente stock para esta venta.');
      return;
    }

    const finalPrice = isFriendPrice ? Number(friendPrice) : product.price;
    const totalPrice = finalPrice * quantityNum;

    if (isSplitPayment) {
      const cashValue = Number(cashAmount);
      const nequiValue = Number(nequiAmount);
      
      if (Math.abs(cashValue + nequiValue - totalPrice) > 0.01) {
        alert('La suma de los pagos debe ser igual al total de la venta.');
        return;
      }

      // Delete original sale
      await onDelete(sale.id);

      // Create two sales for split payment
      if (cashValue > 0) {
        await onSave({
          id: crypto.randomUUID(),
          productId: product.id,
          quantity: quantityNum,
          totalPrice: cashValue,
          paymentMethod: 'efectivo',
          tableNumber: tableNumber || undefined,
          date: new Date().toISOString(),
          status: sale.status
        });
      }

      if (nequiValue > 0) {
        await onSave({
          id: crypto.randomUUID(),
          productId: product.id,
          quantity: quantityNum,
          totalPrice: nequiValue,
          paymentMethod: 'nequi',
          tableNumber: tableNumber || undefined,
          date: new Date().toISOString(),
          status: sale.status
        });
      }
    } else {
      const updatedSale: Sale = {
        ...sale,
        quantity: quantityNum,
        totalPrice,
        paymentMethod,
        tableNumber: tableNumber || undefined,
      };
      await onSave(updatedSale);
    }
    
    onClose();
  };

  const handleDelete = async () => {
    if (window.confirm('¿Está seguro de que desea eliminar este pedido?')) {
      await onDelete(sale.id);
      onClose();
    }
  };

  const handleSplitPaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setIsSplitPayment(isChecked);
    
    const total = Number(quantity) * (isFriendPrice ? Number(friendPrice) : product.price);
    if (isChecked) {
      setCashAmount(total.toString());
      setNequiAmount('0');
    }
  };

  const handleCashAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cashValue = Number(e.target.value);
    const total = Number(quantity) * (isFriendPrice ? Number(friendPrice) : product.price);
    setCashAmount(e.target.value);
    setNequiAmount((total - cashValue).toString());
  };

  const handleNequiAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nequiValue = Number(e.target.value);
    const total = Number(quantity) * (isFriendPrice ? Number(friendPrice) : product.price);
    setNequiAmount(e.target.value);
    setCashAmount((total - nequiValue).toString());
  };

  if (!isOpen) return null;

  const totalAmount = Number(quantity) * (isFriendPrice ? Number(friendPrice) : product.price);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Editar Pedido</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">{product.name}</h3>
            <p className="text-sm text-gray-600">{product.category}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mesa/Referencia
            </label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Ej: Mesa 1, Barra, etc."
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={isFriendPrice}
                onChange={(e) => {
                  setIsFriendPrice(e.target.checked);
                  if (!e.target.checked) setFriendPrice(product.price.toString());
                }}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Precio Amigos</span>
            </label>
            
            {isFriendPrice && (
              <input
                type="number"
                step="0.01"
                min="0"
                value={friendPrice}
                onChange={(e) => setFriendPrice(e.target.value)}
                placeholder="Ingrese el precio especial"
                className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm"
                required
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={isSplitPayment}
                onChange={handleSplitPaymentChange}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Dividir Pago</span>
            </label>

            {isSplitPayment ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto en Efectivo
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={totalAmount}
                    value={cashAmount}
                    onChange={handleCashAmountChange}
                    className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto en Nequi
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={totalAmount}
                    value={nequiAmount}
                    onChange={handleNequiAmountChange}
                    className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Total restante: {formatCurrency(totalAmount - Number(cashAmount) - Number(nequiAmount))}
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'efectivo' | 'nequi' | 'datafono')}
                  className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm"
                  required
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="nequi">Nequi</option>
                  <option value="datafono">Datáfono</option>
                </select>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between items-baseline mb-4">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-xl font-bold text-blue-600">
                {formatCurrency(totalAmount)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 size={20} />
                <span>Eliminar</span>
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save size={20} />
                  <span>Guardar</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};