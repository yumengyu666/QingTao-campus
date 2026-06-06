export interface CartItem {
  id: number;
  userId: number;
  goodsId: number;
  createdAt: string;
  goods?: {
    id: number;
    title: string;
    price: number;
    condition: string;
    images: string[];
    status: string;
    user?: {
      id: number;
      nickname: string;
      wechat: string;
      qq: string;
    };
  };
}
