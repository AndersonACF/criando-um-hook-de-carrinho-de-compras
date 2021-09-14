import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];
      const existingProduct = newCart.find(a => a.id === productId)
      const stock = await api.get<Stock>(`/stock/${productId}`);

      const currentAmount = existingProduct ? existingProduct.amount + 1 : 0;

      if (currentAmount > stock.data.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (!existingProduct) {
        const product = await api.get(`/products/${productId}`).then(response => { return response.data });
        newCart.push({ ...product, amount: 1 });
      } else {
        existingProduct.amount = currentAmount;
      }

      setCart(newCart)
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart];

      const productIndex = newCart.findIndex(a => a.id === productId);
      if (productIndex > -1) {
        newCart.splice(productIndex, 1)
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      }else{
        throw Error();
      }
    }
    catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1)
        return

      const newCart = [...cart];
      const stock = await api.get<Stock>(`/stock/${productId}`);

      if (stock.data.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const product = newCart.find(a => a.id === productId);

      if (product) {
        product.amount = amount;
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      }else
        throw Error();
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
